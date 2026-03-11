import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatusBadge } from './StatusBadge';
import { DishwasherModel3D } from './DishwasherModel3D';
import { Clock, Thermometer, Droplets, RotateCcw, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Station } from '@/types/station';

interface StationCardProps {
  station: Station;
  onClick: () => void;
}

const STATUS_BORDER: Record<string, string> = {
  Running:      'border-l-[3px] border-l-green-500',
  Completed:    'border-l-[3px] border-l-indigo-500',
  Idle:         'border-l-[3px] border-l-gray-300',
  Fault:        'border-l-[3px] border-l-red-500',
  Disconnected: 'border-l-[3px] border-l-amber-500',
};

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
      className={cn(
        'cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 overflow-hidden',
        STATUS_BORDER[station.status] ?? 'border-l-[3px] border-l-gray-300'
      )}
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

        {/* 3D Dishwasher Model */}
        <DishwasherModel3D status={station.status} progress={progressPercentage} />

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
            <div className="flex items-center space-x-1.5 mb-1.5">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, #818cf8, #4f46e5)',
                  boxShadow: '2px 2px 4px rgba(79,70,229,0.35), -1px -1px 2px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <RotateCcw className="h-2.5 w-2.5 text-white" />
              </span>
              <span className="text-xs text-muted-foreground">Cycles</span>
            </div>
            <div className="font-semibold text-foreground text-sm">
              {station.cycles.toLocaleString()}
            </div>
          </div>

          {/* Program */}
          <div className="bg-dashboard-metric rounded-lg p-2 border border-border/50">
            <div className="flex items-center space-x-1.5 mb-1.5">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, #34d399, #059669)',
                  boxShadow: '2px 2px 4px rgba(5,150,105,0.35), -1px -1px 2px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <Cog className="h-2.5 w-2.5 text-white" />
              </span>
              <span className="text-xs text-muted-foreground">Program</span>
            </div>
            <div className="font-semibold text-foreground text-xs truncate">
              {station.program_name || 'None'}
            </div>
          </div>

          {/* Temperature */}
          <div className="bg-dashboard-metric rounded-lg p-2 border border-border/50">
            <div className="flex items-center space-x-1.5 mb-1.5">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, #fb923c, #dc2626)',
                  boxShadow: '2px 2px 4px rgba(220,38,38,0.35), -1px -1px 2px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <Thermometer className="h-2.5 w-2.5 text-white" />
              </span>
              <span className="text-xs text-muted-foreground">Temp</span>
            </div>
            <div className="font-semibold text-foreground text-sm">
              {station.temperature_c ? `${Math.round(station.temperature_c)}℃` : '--'}
            </div>
          </div>

          {/* Inflow */}
          <div className="bg-dashboard-metric rounded-lg p-2 border border-border/50">
            <div className="flex items-center space-x-1.5 mb-1.5">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-md flex-shrink-0"
                style={{
                  background: 'linear-gradient(145deg, #38bdf8, #0284c7)',
                  boxShadow: '2px 2px 4px rgba(2,132,199,0.35), -1px -1px 2px rgba(255,255,255,0.7), inset 0 1px 0 rgba(255,255,255,0.25)',
                }}
              >
                <Droplets className="h-2.5 w-2.5 text-white" />
              </span>
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