import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
        'group relative cursor-pointer overflow-hidden border border-white/60 bg-gradient-to-b from-white to-slate-50/95',
        'shadow-[0_8px_24px_rgba(15,23,42,0.06)] hover:shadow-[0_14px_36px_rgba(15,23,42,0.12)]',
        'backdrop-blur-sm transition-all duration-300 hover:-translate-y-1',
        STATUS_BORDER[station.status] ?? 'border-l-[3px] border-l-gray-300'
      )}
      onClick={onClick}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/85 to-transparent" />
      <CardContent className="relative p-4 space-y-3">
        {/* Corner visual: circular feathered station thumbnail */}
        <div className="absolute top-3 right-3 h-[70px] w-[70px] rounded-full border border-slate-200/80 bg-white/70 shadow-[0_8px_18px_rgba(15,23,42,0.10)] overflow-hidden">
          <DishwasherModel3D status={station.status} progress={progressPercentage} variant="corner" />
          <div className="pointer-events-none absolute inset-0 rounded-full bg-[radial-gradient(circle,transparent_58%,rgba(248,250,252,0.95)_100%)]" />
        </div>

        {/* Header: Station ID and Status */}
        <div className="flex items-center justify-between pr-[66px]">
          <div className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-0.5 text-sm font-semibold text-slate-800 shadow-sm">
            {station.slot_code}
          </div>
          <StatusBadge status={station.status} className="shadow-sm" />
        </div>

        {/* Device Information */}
        <div className="truncate rounded-md border border-slate-200/70 bg-white/70 px-2.5 py-1 text-xs text-slate-500 mr-[66px]">
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
              className="h-2 bg-slate-200/70"
            />
          </div>
        )}

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Cycles */}
          <div className="rounded-xl p-3 bg-slate-50/80 flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 bg-indigo-50">
              <RotateCcw className="text-indigo-500" style={{width:'18px',height:'18px'}} />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-slate-500 leading-none mb-1">Cycles</span>
              <span className="font-semibold text-slate-800 text-[15px] leading-none">{station.cycles.toLocaleString()}</span>
            </div>
          </div>

          {/* Program */}
          <div className="rounded-xl p-3 bg-slate-50/80 flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 bg-emerald-50">
              <Cog className="text-emerald-500" style={{width:'18px',height:'18px'}} />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-slate-500 leading-none mb-1">Program</span>
              <span className="font-semibold text-slate-800 text-sm leading-none truncate">{station.program_name || 'None'}</span>
            </div>
          </div>

          {/* Temperature */}
          <div className="rounded-xl p-3 bg-slate-50/80 flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 bg-orange-50">
              <Thermometer className="text-orange-500" style={{width:'18px',height:'18px'}} />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-slate-500 leading-none mb-1">Temp</span>
              <span className="font-semibold text-slate-800 text-[15px] leading-none">{station.temperature_c ? `${Math.round(station.temperature_c)}℃` : '--'}</span>
            </div>
          </div>

          {/* Inflow */}
          <div className="rounded-xl p-3 bg-slate-50/80 flex items-center gap-2.5">
            <span className="flex items-center justify-center w-8 h-8 rounded-xl flex-shrink-0 bg-sky-50">
              <Droplets className="text-sky-500" style={{width:'18px',height:'18px'}} />
            </span>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] text-slate-500 leading-none mb-1">Inflow</span>
              <span className="font-semibold text-slate-800 text-[15px] leading-none">{station.inflow_l ? `${station.inflow_l.toFixed(1)}L` : '--'}</span>
            </div>
          </div>
        </div>

        {/* Status Footer */}
        {station.status === 'Completed' && (
          <div className="text-xs text-status-completed bg-status-completed-bg px-2 py-1 rounded-md border border-status-completed/20">
            Task completed successfully
          </div>
        )}
        
        {station.status === 'Idle' && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/80">
            <span className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-slate-200 text-slate-500 font-bold leading-none flex-shrink-0" style={{fontSize:'9px'}}>i</span>
            Station free - ready for new task
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