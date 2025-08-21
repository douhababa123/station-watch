import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Building2, 
  Cog, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  X,
  Bell
} from 'lucide-react';
import type { Statistics, Notification } from '@/types/station';

interface StatsSidebarProps {
  stats: Statistics;
  notifications: Notification[];
  onNotificationAcknowledge: (id: string) => void;
}

export const StatsSidebar: React.FC<StatsSidebarProps> = ({
  stats,
  notifications,
  onNotificationAcknowledge
}) => {
  const statCards = [
    {
      title: '总工站数量',
      value: stats.totalStations,
      icon: Building2,
      color: 'text-primary'
    },
    {
      title: '测试机器数量',
      value: stats.uniqueDevices,
      icon: Cog,
      color: 'text-primary'
    },
    {
      title: '空余工站',
      value: stats.idleStations,
      icon: Clock,
      color: 'text-status-idle'
    },
    {
      title: '维修工站',
      value: stats.faultStations,
      icon: AlertTriangle,
      color: 'text-status-fault'
    }
  ];

  const formatNotificationTime = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return timestamp.toLocaleDateString();
  };

  return (
    <aside className="w-80 bg-dashboard-sidebar border-r border-border shadow-card">
      <div className="p-6">
        {/* Statistics Cards */}
        <div className="space-y-4 mb-8">
          <h2 className="text-lg font-semibold text-foreground mb-4">
            System Statistics
          </h2>
          
          {statCards.map((stat, index) => (
            <Card key={index} className="shadow-card hover:shadow-card-hover transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                  <div className={`p-2 rounded-lg bg-secondary ${stat.color}`}>
                    <stat.icon className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Notifications */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              Notifications
            </h2>
            <div className="flex items-center space-x-1">
              <Bell className="h-4 w-4 text-muted-foreground" />
              <Badge variant="secondary" className="text-xs">
                {notifications.length}
              </Badge>
            </div>
          </div>

          <ScrollArea className="h-96">
            {notifications.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`shadow-card animate-slide-in-right ${
                      notification.type === 'fault' 
                        ? 'border-status-fault bg-status-fault-bg' 
                        : 'border-status-completed bg-status-completed-bg'
                    }`}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between space-x-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            {notification.type === 'fault' ? (
                              <AlertTriangle className="h-4 w-4 text-status-fault" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 text-status-completed" />
                            )}
                            <Badge 
                              variant="outline" 
                              className="text-xs"
                            >
                              {notification.stationId}
                            </Badge>
                          </div>
                          <p className="text-sm text-foreground">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatNotificationTime(notification.timestamp)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={() => onNotificationAcknowledge(notification.id)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </aside>
  );
};