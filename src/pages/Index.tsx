import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Clock, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { StatsSidebar } from '@/components/dashboard/StatsSidebar';
import { SectionGrid } from '@/components/dashboard/SectionGrid';
import { StationDetailsDrawer } from '@/components/dashboard/StationDetailsDrawer';
import { generateMockStations, updateStationsRealtime } from '@/lib/mockData';
import type { Station, StationStatus, FilterState } from '@/types/station';

const Index = () => {
  // State management
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState<Station | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [filters, setFilters] = useState<FilterState>({
    section: 'all',
    status: 'all',
    search: '',
    hideDisconnected: false
  });
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    type: 'completion' | 'fault';
    stationId: string;
    message: string;
    timestamp: Date;
  }>>([]);

  // Initialize mock data
  useEffect(() => {
    const mockData = generateMockStations();
    setStations(mockData);
  }, []);

  // Real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
      setStations(prevStations => {
        const { updatedStations, newNotifications } = updateStationsRealtime(prevStations);
        
        // Add new notifications
        if (newNotifications.length > 0) {
          setNotifications(prev => [
            ...newNotifications.map(n => ({
              id: `${n.stationId}-${Date.now()}`,
              ...n,
              timestamp: new Date()
            })),
            ...prev
          ].slice(0, 10)); // Keep only last 10 notifications
        }

        return updatedStations;
      });
    }, 1500); // Update every 1.5 seconds

    return () => clearInterval(interval);
  }, []);

  // Filter stations
  const filteredStations = useMemo(() => {
    return stations.filter(station => {
      // Section filter
      if (filters.section !== 'all' && station.section !== filters.section) {
        return false;
      }

      // Status filter
      if (filters.status !== 'all' && station.status !== filters.status) {
        return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesId = station.id.toLowerCase().includes(searchLower);
        const matchesSlot = station.slot_code.toLowerCase().includes(searchLower);
        const matchesDevice = station.device_sn?.toLowerCase().includes(searchLower) || false;
        
        if (!matchesId && !matchesSlot && !matchesDevice) {
          return false;
        }
      }

      // Hide disconnected filter
      if (filters.hideDisconnected && station.status === 'Disconnected') {
        return false;
      }

      return true;
    });
  }, [stations, filters]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalStations = stations.length;
    const uniqueDevices = new Set(
      stations
        .filter(s => s.device_model && s.device_sn)
        .map(s => `${s.device_model}-${s.device_sn}`)
    ).size;
    const idleStations = stations.filter(s => s.status === 'Idle').length;
    const faultStations = stations.filter(s => s.status === 'Fault').length;

    return {
      totalStations,
      uniqueDevices,
      idleStations,
      faultStations
    };
  }, [stations]);

  // Handlers
  const handleStationClick = (station: Station) => {
    setSelectedStation(station);
    setIsDrawerOpen(true);
  };

  const handleStationUpdate = (updatedStation: Station) => {
    setStations(prev => 
      prev.map(s => s.id === updatedStation.id ? updatedStation : s)
    );
    setSelectedStation(updatedStation);
  };

  const handleNotificationAcknowledge = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  return (
    <div className="min-h-screen bg-dashboard-bg">
      {/* Header */}
      <DashboardHeader 
        currentTime={currentTime}
        filters={filters}
        onFiltersChange={setFilters}
      />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Left Sidebar - Statistics & Notifications */}
        <StatsSidebar
          stats={stats}
          notifications={notifications}
          onNotificationAcknowledge={handleNotificationAcknowledge}
        />

        {/* Main Content */}
        <main className="flex-1 p-6 overflow-auto">
          <SectionGrid
            stations={filteredStations}
            onStationClick={handleStationClick}
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