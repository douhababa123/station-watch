import React from 'react';
import { cn } from '@/lib/utils';
import type { StationStatus } from '@/types/station';

interface StatusBadgeProps {
  status: StationStatus;
  className?: string;
}

const STATUS_CONFIG: Record<StationStatus, {
  dot: string;
  pulse: boolean;
  badge: string;
  label: string;
}> = {
  Running: {
    dot: 'bg-green-500',
    pulse: true,
    badge: 'bg-green-50 text-green-700 border-green-400/70 shadow-[0_0_0_1px_rgba(22,163,74,0.15),0_2px_6px_rgba(22,163,74,0.18)]',
    label: 'Running',
  },
  Completed: {
    dot: 'bg-indigo-500',
    pulse: false,
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-400/70 shadow-[0_0_0_1px_rgba(79,70,229,0.12),0_2px_6px_rgba(79,70,229,0.14)]',
    label: 'Completed',
  },
  Idle: {
    dot: 'bg-slate-400',
    pulse: false,
    badge: 'bg-slate-100 text-slate-600 border-slate-400/60 shadow-sm',
    label: 'Idle',
  },
  Fault: {
    dot: 'bg-red-500',
    pulse: true,
    badge: 'bg-red-50 text-red-700 border-red-400/70 shadow-[0_0_0_1px_rgba(220,38,38,0.15),0_2px_6px_rgba(220,38,38,0.18)]',
    label: 'Fault',
  },
  Disconnected: {
    dot: 'bg-amber-500',
    pulse: false,
    badge: 'bg-amber-50 text-amber-700 border-amber-400/70 shadow-[0_0_0_1px_rgba(180,83,9,0.12),0_2px_6px_rgba(180,83,9,0.14)]',
    label: 'Disconnected',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const config = STATUS_CONFIG[status] ?? {
    dot: 'bg-slate-400', pulse: false,
    badge: 'bg-muted text-muted-foreground border-muted-foreground/30',
    label: 'Unknown',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold leading-none tracking-wide',
        config.badge,
        className
      )}
    >
      {/* Dot indicator */}
      <span className="relative flex h-2 w-2 flex-shrink-0">
        {config.pulse && (
          <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', config.dot)} />
        )}
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.dot)} />
      </span>
      {config.label}
    </span>
  );
};