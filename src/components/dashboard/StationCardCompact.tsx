import React from 'react';
import { cn } from '@/lib/utils';
import type { Station } from '@/types/station';

interface StationCardCompactProps {
  station: Station;
  onClick: () => void;
}

const STATUS_BORDER: Record<string, string> = {
  Running:      'border-l-green-500',
  Completed:    'border-l-indigo-500',
  Idle:         'border-l-gray-400',
  Fault:        'border-l-red-500',
  Disconnected: 'border-l-yellow-500',
};

const STATUS_BG: Record<string, string> = {
  Running:      'bg-green-50 dark:bg-green-950/20',
  Fault:        'bg-red-50 dark:bg-red-950/20',
  Disconnected: 'bg-yellow-50 dark:bg-yellow-950/20',
  Completed:    'bg-indigo-50 dark:bg-indigo-950/20',
  Idle:         '',
};

export const StationCardCompact: React.FC<StationCardCompactProps> = ({ station, onClick }) => {
  const formatTime = (minutes: number) => {
    if (minutes <= 0) return '--';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h${m}m` : `${m}m`;
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        'cursor-pointer rounded-md border border-border border-l-4 px-3 py-2',
        'flex items-center justify-between gap-2',
        'hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150',
        STATUS_BORDER[station.status] ?? 'border-l-gray-300',
        STATUS_BG[station.status] ?? '',
      )}
    >
      <span className="text-sm font-semibold text-foreground truncate">{station.slot_code}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-xs text-muted-foreground">{station.status}</span>
        {station.status === 'Running' && (
          <span className="text-xs font-mono text-green-600">{formatTime(station.time_remaining)}</span>
        )}
      </div>
    </div>
  );
};
