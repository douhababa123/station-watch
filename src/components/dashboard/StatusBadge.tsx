import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { StationStatus } from '@/types/station';

interface StatusBadgeProps {
  status: StationStatus;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className }) => {
  const getStatusConfig = (status: StationStatus) => {
    switch (status) {
      case 'Running':
        return {
          className: 'bg-status-running-bg text-status-running border-status-running/30 animate-status-breathe',
          label: 'Running'
        };
      case 'Completed':
        return {
          className: 'bg-status-completed-bg text-status-completed border-status-completed/30',
          label: 'Completed'
        };
      case 'Idle':
        return {
          className: 'bg-status-idle-bg text-status-idle border-status-idle/30',
          label: 'Idle'
        };
      case 'Fault':
        return {
          className: 'bg-status-fault-bg text-status-fault border-status-fault/30',
          label: 'Fault'
        };
      case 'Disconnected':
        return {
          className: 'bg-status-disconnected-bg text-status-disconnected border-status-disconnected/30',
          label: 'Disconnected'
        };
      default:
        return {
          className: 'bg-muted text-muted-foreground',
          label: 'Unknown'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.label}
    </Badge>
  );
};