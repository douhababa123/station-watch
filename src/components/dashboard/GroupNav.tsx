import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Building2, Cog, Clock, AlertTriangle, CheckCircle2, Bell, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Station, StationGroup, StationGroupConfig } from '@/types/station';

interface Notification {
  id: string;
  type: 'completion' | 'fault';
  stationId: string;
  message: string;
  timestamp: Date;
}

interface GroupNavProps {
  groups: StationGroupConfig[];
  stations: Station[];
  activeGroup: StationGroup | null;
  onGroupClick: (groupId: StationGroup) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  notifications: Notification[];
  onNotificationAcknowledge: (id: string) => void;
}

const STATUS_DOTS: { key: import('@/types/station').StationStatus; color: string; label: string }[] = [
  { key: 'Running',      color: 'bg-green-500',  label: 'Running' },
  { key: 'Completed',    color: 'bg-indigo-500', label: 'Completed' },
  { key: 'Idle',         color: 'bg-gray-400',   label: 'Idle' },
  { key: 'Fault',        color: 'bg-red-500',    label: 'Fault' },
  { key: 'Disconnected', color: 'bg-yellow-500', label: 'Disconnected' },
];

const formatRelativeTime = (date: Date) => {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

export const GroupNav: React.FC<GroupNavProps> = ({
  groups,
  stations,
  activeGroup,
  onGroupClick,
  collapsed,
  onToggleCollapse,
  notifications,
  onNotificationAcknowledge,
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
    return {
      totalStations: stations.length,
      // 测试机器数量 = Running（正在测试中）
      runningStations: stations.filter(s => s.status === 'Running').length,
      // 空余工站 = Idle + Completed（未占用 / 刚完成可复用）
      idleStations: stations.filter(s => s.status === 'Idle' || s.status === 'Completed').length,
      // 维修工站 = Fault + Disconnected（需要处理）
      faultStations: stations.filter(s => s.status === 'Fault' || s.status === 'Disconnected').length,
    };
    // 三类之和 === totalStations 恒成立
  }, [stations]);

  const statCards = [
    { label: '总工站数量', value: sysStats.totalStations, icon: Building2, iconBg: 'bg-primary/10', color: 'text-primary' },
    { label: '测试机器数量', value: sysStats.runningStations, icon: Cog, iconBg: 'bg-primary/10', color: 'text-primary' },
    { label: '空余工站', value: sysStats.idleStations, icon: Clock, iconBg: 'bg-muted', color: 'text-muted-foreground' },
    { label: '维修工站', value: sysStats.faultStations, icon: AlertTriangle, iconBg: 'bg-red-100', color: 'text-red-500' },
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
        <div className="px-3 pt-4 pb-3 border-b border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
            System Statistics
          </p>
          <div className="flex flex-col gap-2">
            {statCards.map(({ label, value, icon: Icon, iconBg, color }) => (
              <div
                key={label}
                className="bg-muted border border-border rounded-lg px-3 py-2.5 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-2xl font-bold text-foreground leading-none mt-1">{value}</p>
                </div>
                <div className={cn('h-9 w-9 flex items-center justify-center rounded-lg flex-shrink-0', iconBg)}>
                  <Icon className={cn('h-4 w-4', color)} />
                </div>
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
                'w-full relative overflow-hidden text-left rounded-xl border transition-all duration-200',
                collapsed ? 'px-0 py-2 flex items-center justify-center' : 'px-3 py-2.5',
                isActive
                  ? 'bg-gradient-to-r from-primary/15 via-primary/10 to-transparent border-primary/30 text-foreground shadow-[0_6px_14px_rgba(99,102,241,0.16)] ring-1 ring-primary/20'
                  : 'bg-white/70 border-border/70 text-foreground hover:bg-white hover:border-primary/20 hover:shadow-[0_6px_14px_rgba(15,23,42,0.08)]'
              )}
            >
              {collapsed ? (
                /* 折叠态：仅显示首字符 */
                <span className={cn('text-sm font-bold', isActive ? 'text-primary' : 'text-foreground')}>{group.id}</span>
              ) : (
                /* 展开态：标签 + 状态色块 */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className={cn('text-sm font-semibold', isActive ? 'text-primary' : 'text-slate-700')}>{group.label}</span>
                    <span className={cn(
                      'text-[11px] px-1.5 py-0.5 rounded-full border',
                      isActive
                        ? 'bg-primary/10 text-primary border-primary/25'
                        : 'bg-white text-muted-foreground border-border/80'
                    )}>
                      {total}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {STATUS_DOTS.map(({ key, color }) =>
                      counts[key] > 0 ? (
                        <span
                          key={key}
                          className={cn(
                            'flex items-center gap-1 text-[11px] px-1.5 py-0.5 rounded-full border',
                            isActive
                              ? 'bg-white/85 border-primary/15 text-slate-700'
                              : 'bg-white/75 border-border/70 text-muted-foreground'
                          )}
                        >
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

      {/* Notifications Section */}
      {!collapsed && (
        <div className="border-t border-border px-3 pt-3 pb-2 flex flex-col" style={{ maxHeight: '300px', minHeight: '80px' }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Notifications
            </p>
            {notifications.length > 0 ? (
              <span className="text-[10px] bg-red-100 border border-red-200 text-red-600 font-semibold px-1.5 py-0.5 rounded-full">
                {notifications.length}
              </span>
            ) : (
              <span className="text-[10px] bg-muted border border-border text-muted-foreground px-1.5 py-0.5 rounded-full">0</span>
            )}
          </div>
          <div className="flex flex-col gap-1.5 overflow-y-auto flex-1 pr-0.5">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-5 text-muted-foreground">
                <Bell className="h-5 w-5 mb-1.5 opacity-25" />
                <p className="text-xs">No notifications</p>
              </div>
            ) : (
              notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'relative rounded-lg px-2.5 py-2 border text-xs',
                    n.type === 'fault'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-indigo-50 border-indigo-200'
                  )}
                >
                  {/* header: icon + station badge */}
                  <div className="flex items-center gap-1.5 mb-1 pr-5">
                    {n.type === 'fault' ? (
                      <AlertTriangle className="h-3 w-3 flex-shrink-0 text-red-500" />
                    ) : (
                      <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-indigo-500" />
                    )}
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full border',
                      n.type === 'fault'
                        ? 'bg-red-100 text-red-700 border-red-200'
                        : 'bg-indigo-100 text-indigo-700 border-indigo-200'
                    )}>
                      {n.stationId}
                    </span>
                  </div>
                  {/* message */}
                  <p className="text-[11px] text-foreground leading-snug mb-1">{n.message}</p>
                  {/* time */}
                  <p className="text-[10px] text-muted-foreground">{formatRelativeTime(n.timestamp)}</p>
                  {/* close */}
                  <button
                    onClick={() => onNotificationAcknowledge(n.id)}
                    className="absolute top-1.5 right-1.5 p-0.5 rounded text-muted-foreground hover:bg-black/10 hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 折叠时：铃铛角标 */}
      {collapsed && notifications.length > 0 && (
        <div className="flex justify-center py-2 border-t border-border">
          <div className="relative">
            <Bell className="h-4 w-4 text-muted-foreground" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[8px] font-bold text-white">
              {notifications.length > 9 ? '9+' : notifications.length}
            </span>
          </div>
        </div>
      )}

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
