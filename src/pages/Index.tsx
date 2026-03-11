import React, { useState, useEffect, useMemo } from 'react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { GroupNav } from '@/components/dashboard/GroupNav';
import { GroupGrid } from '@/components/dashboard/GroupGrid';
import { StationDetailsDrawer } from '@/components/dashboard/StationDetailsDrawer';
import { generateMockStations, updateStationsRealtime } from '@/lib/mockData';
import { useScrollSpy } from '@/hooks/useScrollSpy';
import { STATION_GROUPS } from '@/types/station';
import type { Station, StationStatus, FilterState, StationGroup } from '@/types/station';

const GROUP_IDS = STATION_GROUPS.map(g => g.id);

const Index = () => {
  // State management
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [viewMode, setViewMode] = useState<'detail' | 'compact'>('detail');
  const [navCollapsed, setNavCollapsed] = useState(false);
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

  const [activeGroup, setActiveGroup] = useState<StationGroup | null>(null);
  const scrollSpyGroup = useScrollSpy(GROUP_IDS);

  // 滚动侦听结果同步到 activeGroup
  useEffect(() => {
    if (scrollSpyGroup) setActiveGroup(scrollSpyGroup);
  }, [scrollSpyGroup]);

  // Initialize mock data
  useEffect(() => {
    setStations(generateMockStations());
  }, []);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setStations(prevStations => {
        const { updatedStations, newNotifications } = updateStationsRealtime(prevStations);
        if (newNotifications.length > 0) {
          setNotifications(prev => [
            ...newNotifications.map(n => ({
              id: `${n.stationId}-${Date.now()}`,
              ...n,
              timestamp: new Date(),
            })),
            ...prev,
          ].slice(0, 10));
        }
        return updatedStations;
      });
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

  const handleStationUpdate = (updatedStation: Station) => {
    setStations(prev => prev.map(s => s.id === updatedStation.id ? updatedStation : s));
    setSelectedStation(updatedStation);
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
        onStationUpdate={handleStationUpdate}
      />
    </div>
  );
};

export default Index;