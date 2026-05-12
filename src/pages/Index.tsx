import React, { useState, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { GroupNav } from '@/components/dashboard/GroupNav';
import { GroupGrid } from '@/components/dashboard/GroupGrid';
import { StationDetailsDrawer } from '@/components/dashboard/StationDetailsDrawer';
import {
  updateStationRegistryEntry,
} from '@/lib/stationRegistry';
import { fetchLiveStations, refreshLiveStations, subscribeToLiveStations } from '@/lib/liveStations';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { STATION_GROUPS } from '@/types/station';
import { useToast } from '@/hooks/use-toast';
import type { Station, FilterState, StationGroup } from '@/types/station';
import type { StationRegistryPatch } from '@/lib/stationRegistry';

const GROUP_IDS = STATION_GROUPS.map(g => g.id);

const Index = () => {
  // State management
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'detail' | 'compact'>('detail');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [isInitializingSnapshot, setIsInitializingSnapshot] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    group: 'all',
    status: 'all',
    search: '',
    hideDisconnected: false,
  });
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'completion' | 'fault';
    stationId: string;
    message: string;
    timestamp: Date;
  }>>([]);
  const { toast } = useToast();

  const [activeGroup, setActiveGroup] = useState<StationGroup | null>(null);
  const scrollSpyGroup = useScrollSpy(GROUP_IDS);

  // 滚动侦听结果同步到 activeGroup
  useEffect(() => {
    if (scrollSpyGroup) setActiveGroup(scrollSpyGroup);
  }, [scrollSpyGroup]);

  useEffect(() => {
    let cancelled = false;

    const loadLiveStations = async () => {
      try {
        const { stations: nextStations } = await fetchLiveStations();
        if (!cancelled) {
          setStations(nextStations);
        }
      } catch (error) {
        console.error('[liveStations] Failed to load live stations', error);
      }
    };

    void loadLiveStations();

    const cleanup = subscribeToLiveStations(
      (updatedStation) => {
        if (cancelled) return;
        setStations((previousStations) => {
          const hasExisting = previousStations.some((station) => station.id === updatedStation.id);
          if (!hasExisting) {
            return [...previousStations, updatedStation].sort((left, right) =>
              left.id.localeCompare(right.id, undefined, { numeric: true }),
            );
          }

          return previousStations.map((station) =>
            station.id === updatedStation.id ? updatedStation : station,
          );
        });
      },
      () => {
        if (cancelled) return;
        void loadLiveStations();
      },
    );

    return () => {
      cancelled = true;
      cleanup();
    };
  }, []);

  useEffect(() => {
    if (!selectedStation) return;

    const updatedSelectedStation = stations.find((station) => station.id === selectedStation.id);
    if (updatedSelectedStation && updatedSelectedStation !== selectedStation) {
      setSelectedStation(updatedSelectedStation);
    }
  }, [selectedStation, stations]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  // Filter stations
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      if (filters.group !== 'all' && station.group !== filters.group) return false;
      if (filters.status !== 'all' && station.status !== filters.status) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (
          !station.id.toLowerCase().includes(q) &&
          !station.slot_code.toLowerCase().includes(q) &&
          !(station.device_sn?.toLowerCase().includes(q))
        ) return false;
      }
      if (filters.hideDisconnected && station.status === 'Disconnected') return false;
      return true;
    });
  }, [stations, filters]);

  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setIsDrawerOpen(true);
  };

  const handleRegistrySave = async (stationId: string, patch: StationRegistryPatch) => {
    await updateStationRegistryEntry(stationId, patch);
    const { stations: nextStations } = await fetchLiveStations();
    setStations(nextStations);
  };

  const handleInitializeSnapshot = async () => {
    try {
      setIsInitializingSnapshot(true);
      const result = await refreshLiveStations();
      const { stations: nextStations } = await fetchLiveStations();
      setStations(nextStations);

      const successCount = result.results?.filter((entry) => entry.ok).length ?? 0;
      const failureCount = result.results?.filter((entry) => !entry.ok).length ?? 0;
      toast({
        title: 'Initialization Snapshot Finished',
        description: `Success: ${successCount}, Failed: ${failureCount}`,
      });
    } catch (error) {
      toast({
        title: 'Initialization Snapshot Failed',
        description: error instanceof Error ? error.message : 'Failed to initialize live stations.',
        variant: 'destructive',
      });
    } finally {
      setIsInitializingSnapshot(false);
    }
  };

  const handleGroupClick = (groupId: StationGroup) => {
    setActiveGroup(groupId);
    document.getElementById(`group-${groupId}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="h-screen bg-dashboard-bg flex flex-col overflow-hidden">
      {/* Header */}
      <DashboardHeader
        currentTime={currentTime}
        filters={filters}
        onFiltersChange={setFilters}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onInitializeSnapshot={handleInitializeSnapshot}
        isInitializingSnapshot={isInitializingSnapshot}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left: Group Navigation */}
        <GroupNav
          groups={STATION_GROUPS}
          stations={stations}
          activeGroup={activeGroup}
          onGroupClick={handleGroupClick}
          collapsed={navCollapsed}
          onToggleCollapse={() => setNavCollapsed(v => !v)}
          notifications={notifications}
          onNotificationAcknowledge={(id) =>
            setNotifications(prev => prev.filter(n => n.id !== id))
          }
        />

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <GroupGrid
            stations={filteredStations}
            onStationClick={handleStationClick}
            viewMode={viewMode}
          />
        </main>
      </div>

      {/* Station Details Drawer */}
      <StationDetailsDrawer
        station={selectedStation}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onRegistrySave={handleRegistrySave}
      />
    </div>
  );
};

export default Index;