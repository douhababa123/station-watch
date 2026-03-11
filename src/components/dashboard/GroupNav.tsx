import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Station, StationGroup, StationGroupConfig } from '@/types/station';

interface GroupNavProps {
  groups: StationGroupConfig[];
  stations: Station[];
  activeGroup: StationGroup | null;
  onGroupClick: (groupId: StationGroup) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const STATUS_DOTS: { key: import('@/types/station').StationStatus; color: string; label: string }[] = [
  { key: 'Running',      color: 'bg-green-500',  label: 'Running' },
  { key: 'Completed',    color: 'bg-indigo-500', label: 'Completed' },
  { key: 'Idle',         color: 'bg-gray-400',   label: 'Idle' },
  { key: 'Fault',        color: 'bg-red-500',    label: 'Fault' },
  { key: 'Disconnected', color: 'bg-yellow-500', label: 'Disconnected' },
];

export const GroupNav: React.FC<GroupNavProps> = ({
  groups,
  stations,
  activeGroup,
  onGroupClick,
  collapsed,
  onToggleCollapse,
}) => {
  const getGroupStats = (groupId: StationGroup) => {
    const groupStations = stations.filter(s => s.group === groupId);
    const counts = STATUS_DOTS.reduce((acc, { key }) => {
      acc[key] = groupStations.filter(s => s.status === key).length;
      return acc;
    }, {} as Record<string, number>);
    return { total: groupStations.length, counts };
  };

  return (
    <aside
      className={cn(
        'flex flex-col flex-shrink-0 h-full bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-[48px]' : 'w-[220px]'
      )}
    >
      {/* Group 列表 */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {groups.map(group => {
          const { total, counts } = getGroupStats(group.id);
          const isActive = activeGroup === group.id;

          return (
            <button
              key={group.id}
              onClick={() => onGroupClick(group.id)}
              className={cn(
                'w-full text-left rounded-lg transition-all duration-150',
                collapsed ? 'px-0 py-2 flex items-center justify-center' : 'px-3 py-2',
                isActive
                  ? 'bg-primary/10 border-l-2 border-primary text-primary font-semibold'
                  : 'hover:bg-muted text-foreground border-l-2 border-transparent'
              )}
            >
              {collapsed ? (
                /* 折叠态：仅显示首字符 */
                <span className="text-sm font-bold">{group.id}</span>
              ) : (
                /* 展开态：标签 + 状态色块 */
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">{group.label}</span>
                    <span className="text-xs text-muted-foreground">({total})</span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {STATUS_DOTS.map(({ key, color }) =>
                      counts[key] > 0 ? (
                        <span key={key} className="flex items-center gap-0.5 text-xs text-muted-foreground">
                          <span className={cn('inline-block w-2 h-2 rounded-full', color)} />
                          {counts[key]}
                        </span>
                      ) : null
                    )}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 折叠/展开按钮 */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted rounded-md py-1.5 transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronLeft className="h-4 w-4" />
              <span>收起</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
};
