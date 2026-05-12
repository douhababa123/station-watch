import React from 'react';
import { STATION_GROUPS } from '@/types/station';
import type { Station } from '@/types/station';
import { StationCard } from './StationCard';
import { StationCardCompact } from './StationCardCompact';

interface GroupGridProps {
  stations: Station[];
  onStationClick: (station: Station) => void;
  viewMode: 'detail' | 'compact';
}

export const GroupGrid: React.FC<GroupGridProps> = ({ stations, onStationClick, viewMode }) => {
  if (stations.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <span className="text-2xl">🔍</span>
          </div>
          <p className="text-lg font-medium">No stations found</p>
          <p className="text-sm">Try adjusting your filters</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {STATION_GROUPS.map(groupConfig => {
        const groupStations = stations
          .filter(s => s.group === groupConfig.id)
          .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

        if (groupStations.length === 0) return null;

        return (
          <section key={groupConfig.id} id={`group-${groupConfig.id}`} className="scroll-mt-4">
            {/* Group 标题 */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-base font-semibold text-foreground whitespace-nowrap">
                {groupConfig.label}
              </h2>
              <span className="text-xs text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded-full whitespace-nowrap">
                {groupStations.length} 个工位
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* 工位网格 */}
            {viewMode === 'detail' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {groupStations.map(station => (
                  <StationCard
                    key={station.id}
                    station={station}
                    onClick={() => onStationClick(station)}
                  />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
                {groupStations.map(station => (
                  <StationCardCompact
                    key={station.id}
                    station={station}
                    onClick={() => onStationClick(station)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
