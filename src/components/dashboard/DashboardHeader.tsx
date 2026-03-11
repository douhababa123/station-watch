import React from 'react';
import { Search, Filter, Clock, Eye, EyeOff, LayoutList, LayoutGrid } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { FilterState, StationGroup } from '@/types/station';
import { STATION_GROUPS } from '@/types/station';

interface DashboardHeaderProps {
  currentTime: Date;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  viewMode: 'detail' | 'compact';
  onViewModeChange: (mode: 'detail' | 'compact') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  currentTime,
  filters,
  onFiltersChange,
  viewMode,
  onViewModeChange,
}) => {

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

        {/* Right: Time */}
        <div className="flex items-center gap-4">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="font-mono">{formatTime(currentTime)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};