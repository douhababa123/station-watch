import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Building2, Cog, Clock, AlertTriangle } from 'lucide-react';
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

  const sysStats = useMemo(() => {
    const uniqueDevices = new Set(
      stations
        .filter(s => s.device_model && s.device_sn)
        .map(s => `${s.device_model}-${s.device_sn}`)
    ).size;
    return {
      totalStations: stations.length,
      uniqueDevices,
      idleStations: stations.filter(s => s.status === 'Idle').length,
      faultStations: stations.filter(s => s.status === 'Fault').length,
    };
  }, [stations]);

  const statCards = [
    { label: '总工站数量', value: sysStats.totalStations, icon: Building2, color: 'text-primary' },
    { label: '测试机器数量', value: sysStats.uniqueDevices, icon: Cog, color: 'text-primary' },
    { label: '空余工站', value: sysStats.idleStations, icon: Clock, color: 'text-gray-500' },
    { label: '维修工站', value: sysStats.faultStations, icon: AlertTriangle, color: 'text-red-500' },
  ];

  return (
    <aside
      className={cn(
        'flex flex-col flex-shrink-0 h-full bg-card border-r border-border transition-all duration-300',
        collapsed ? 'w-[48px]' : 'w-[260px]'
      )}
    >
      {/* System Statistics — 仅展开态显示 */}
      {!collapsed && (
        <div className="px-3 pt-4 pb-2 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            System Statistics
          </p>
          <div className="flex flex-col gap-2">
            {statCards.map(({ label, value, icon: Icon, color }) => (
              <div
                key={label}
                className="bg-muted/50 border border-border rounded-lg px-3 py-2.5 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground leading-none mt-1">{value}</p>
                </div>
                <Icon className={cn('h-5 w-5 flex-shrink-0', color)} />
              </div>
            ))}
          </div>
        </div>
      )}

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
