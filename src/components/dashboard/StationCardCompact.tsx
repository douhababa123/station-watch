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

const STATUS_TEXT: Record<string, string> = {
  Running:      'text-green-600 font-medium',
  Completed:    'text-indigo-600 font-medium',
  Idle:         'text-gray-500',
  Fault:        'text-red-600 font-medium',
  Disconnected: 'text-amber-600 font-medium',
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
        'group cursor-pointer rounded-xl border border-slate-200/80 border-l-4 px-3 py-2.5',
        'flex items-center justify-between gap-2',
        'bg-gradient-to-b from-white to-slate-50/95 backdrop-blur-sm',
        'shadow-[0_4px_14px_rgba(15,23,42,0.05)] hover:shadow-[0_10px_20px_rgba(15,23,42,0.10)]',
        'hover:-translate-y-0.5 transition-all duration-200',
        STATUS_BORDER[station.status] ?? 'border-l-gray-300',
      )}
    >
      <span className="text-sm font-semibold text-slate-800 truncate">{station.slot_code}</span>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('text-xs', STATUS_TEXT[station.status] ?? 'text-slate-500')}>
          {station.status}
        </span>
        {station.status === 'Running' && (
          <span className="text-xs font-mono text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-md">{formatTime(station.time_remaining)}</span>
        )}
      </div>
    </div>
  );
};
