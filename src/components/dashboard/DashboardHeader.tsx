import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, Clock, Eye, EyeOff, LayoutList, LayoutGrid, Bell, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { FilterState, StationGroup } from '@/types/station';
import { STATION_GROUPS } from '@/types/station';

interface Notification {
  id: string;
  type: 'completion' | 'fault';
  stationId: string;
  message: string;
  timestamp: Date;
}

interface DashboardHeaderProps {
  currentTime: Date;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  viewMode: 'detail' | 'compact';
  onViewModeChange: (mode: 'detail' | 'compact') => void;
  notifications: Notification[];
  onNotificationAcknowledge: (id: string) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentTime,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
  notifications,
  onNotificationAcknowledge,
}) => {
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatRelativeTime = (date: Date) => {
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
  };

  return (
    <header className="bg-card border-b border-border shadow-card">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Left: Title */}
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-foreground">
            Dishwasher Test Dashboard
          </h1>
          <Badge variant="secondary" className="text-xs">
            Live Monitor
          </Badge>
        </div>

        {/* Center: Filters */}
        <div className="flex items-center space-x-4">
          {/* Group Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select
              value={filters.group}
              onValueChange={(value) =>
                onFiltersChange({ ...filters, group: value as 'all' | StationGroup })
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Groups</SelectItem>
                {STATION_GROUPS.map(g => (
                  <SelectItem key={g.id} value={g.id}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <Select
            value={filters.status}
            onValueChange={(value) =>
              onFiltersChange({ ...filters, status: value as any })
            }
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Running">Running</SelectItem>
              <SelectItem value="Idle">Idle</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Fault">Fault</SelectItem>
              <SelectItem value="Disconnected">Disconnected</SelectItem>
            </SelectContent>
          </Select>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search station ID or device SN..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              className="pl-10 w-64"
            />
          </div>

          {/* Hide Disconnected Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              checked={filters.hideDisconnected}
              onCheckedChange={(checked) =>
                onFiltersChange({ ...filters, hideDisconnected: checked })
              }
            />
            <div className="flex items-center space-x-1 text-sm">
              {filters.hideDisconnected ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-muted-foreground">Hide Disconnected</span>
            </div>
          </div>

          {/* View Mode Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewModeChange(viewMode === 'detail' ? 'compact' : 'detail')}
            className="flex items-center gap-1.5"
          >
            {viewMode === 'detail' ? (
              <><LayoutGrid className="h-4 w-4" /><span>紧凑</span></>
            ) : (
              <><LayoutList className="h-4 w-4" /><span>详情</span></>
            )}
          </Button>
        </div>

        {/* Right: Bell + Time */}
        <div className="flex items-center gap-4">
          {/* Notification Bell */}
          <div className="relative" ref={bellRef}>
            <button
              onClick={() => setBellOpen(v => !v)}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {notifications.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {notifications.length > 9 ? '9+' : notifications.length}
                </span>
              )}
            </button>

            {/* Dropdown Panel */}
            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <span className="text-sm font-semibold text-foreground">通知</span>
                  {notifications.length > 0 && (
                    <button
                      onClick={() => notifications.forEach(n => onNotificationAcknowledge(n.id))}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      全部清除
                    </button>
                  )}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                      <Bell className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">暂无通知</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1.5">
                      {notifications.map(n => (
                        <div
                          key={n.id}
                          className={`relative flex items-start gap-3 rounded-lg px-3 py-2.5 border ${
                            n.type === 'fault'
                              ? 'bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800'
                              : 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800'
                          }`}
                        >
                          {n.type === 'fault' ? (
                            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-green-500" />
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${
                                n.type === 'fault'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                  : 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                              }`}>{n.stationId}</span>
                            </div>
                            <p className="text-xs text-foreground leading-snug">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{formatRelativeTime(n.timestamp)}</p>
                          </div>
                          <button
                            onClick={() => onNotificationAcknowledge(n.id)}
                            className="flex-shrink-0 p-0.5 rounded hover:bg-black/10 transition-colors"
                          >
                            <X className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Time */}
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};