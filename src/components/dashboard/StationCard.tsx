import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './StatusBadge';
import { Clock, Thermometer, Droplets, RotateCcw } from 'lucide-react';
import type { Station } from '@/types/station';

interface StationCardProps {
  station: Station;
  onClick: () => void;
}

export const StationCard: React.FC<StationCardProps> = ({ station, onClick }) => {
  const progressPercentage = station.total_time > 0 
    ? ((station.total_time - station.time_remaining) / station.total_time) * 100 
    : 0;

  const formatTime = (minutes: number) => {
    if (minutes === 0) return '0 min';
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins} min`;
  };

  const formatDeviceInfo = (model?: string, sn?: string) => {
    if (!model || !sn) return 'No device assigned';
    
    // Format device SN for better display
    const shortSn = sn.length > 12 ? `${sn.slice(0, 8)}...${sn.slice(-4)}` : sn;
    return `${model} ${shortSn}`;
  };

  return (
    <Card 
      className="cursor-pointer shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-4">
        {/* Header: Station ID and Status */}
        <div className="flex items-center justify-between">
          <div className="font-semibold text-foreground">
            {station.slot_code}
          </div>
          <StatusBadge status={station.status} />
        </div>

        {/* Device Information */}
        <div className="text-sm text-muted-foreground truncate">
          {formatDeviceInfo(station.device_model, station.device_sn)}
        </div>

        {/* Time Remaining Section */}
        {station.status === 'Running' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-1 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>Time remaining</span>
              </div>
              <div className="font-medium text-foreground">
                {formatTime(station.time_remaining)}
              </div>
            </div>
            
            <Progress 
              value={progressPercentage} 
              className="h-2"
            />
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Cycles */}
          <div className="bg-dashboard-metric rounded-lg p-2 border border-border/50">
            <div className="flex items-center space-x-1 mb-1">
              <RotateCcw className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cycles</span>
            </div>
            <div className="font-semibold text-foreground text-sm">
              {station.cycles.toLocaleString()}
            </div>
          </div>

          {/* Program */}
          <div className="bg-dashboard-metric rounded-lg p-2 border border-border/50">
            <div className="text-xs text-muted-foreground mb-1">Program</div>
            <div className="font-semibold text-foreground text-xs truncate">
              {station.program_name || 'None'}
            </div>
          </div>

          {/* Temperature */}
          <div className="bg-dashboard-metric rounded-lg p-2 border border-border/50">
            <div className="flex items-center space-x-1 mb-1">
              <Thermometer className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Temp</span>
            </div>
            <div className="font-semibold text-foreground text-sm">
              {station.temperature_c ? `${Math.round(station.temperature_c)}℃` : '--'}
            </div>
          </div>

          {/* Inflow */}
          <div className="bg-dashboard-metric rounded-lg p-2 border border-border/50">
            <div className="flex items-center space-x-1 mb-1">
              <Droplets className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Inflow</span>
            </div>
            <div className="font-semibold text-foreground text-sm">
              {station.inflow_l ? `${station.inflow_l.toFixed(1)}L` : '--'}
            </div>
          </div>
        </div>

        {/* Status Footer */}
        {station.status === 'Completed' && (
          <div className="text-xs text-status-completed bg-status-completed-bg px-2 py-1 rounded-md border border-status-completed/20">
            Task completed successfully
          </div>
        )}
        
        {station.status === 'Fault' && (
          <div className="text-xs text-status-fault bg-status-fault-bg px-2 py-1 rounded-md border border-status-fault/20">
            Maintenance required
          </div>
        )}
        
        {station.status === 'Disconnected' && (
          <div className="text-xs text-status-disconnected bg-status-disconnected-bg px-2 py-1 rounded-md border border-status-disconnected/20">
            Connection lost
          </div>
        )}
      </CardContent>
    </Card>
  );
};