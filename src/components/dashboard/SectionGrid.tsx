import React from 'react';
import { StationCard } from './StationCard';
import type { Station } from '@/types/station';

interface SectionGridProps {
  stations: Station[];
  onStationClick: (station: Station) => void;
}

export const SectionGrid: React.FC<SectionGridProps> = ({
  stations,
  onStationClick
}) => {
  // Group stations by section
  const sectionGroups = stations.reduce((groups, station) => {
    if (!groups[station.section]) {
      groups[station.section] = [];
    }
    groups[station.section].push(station);
    return groups;
  }, {} as Record<string, Station[]>);

  const sections = ['A', 'B', 'C'] as const;

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
    <div className="space-y-8">
      {sections.map(section => {
        const sectionStations = sectionGroups[section] || [];
        
        if (sectionStations.length === 0) return null;

        return (
          <div key={section} className="space-y-4">
            {/* Section Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                Section {section}
              </h2>
              <div className="text-sm text-muted-foreground">
                {sectionStations.length} station{sectionStations.length !== 1 ? 's' : ''}
              </div>
            </div>

            {/* Station Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {sectionStations
                .sort((a, b) => a.id.localeCompare(b.id))
                .map(station => (
                  <StationCard
                    key={station.id}
                    station={station}
                    onClick={() => onStationClick(station)}
                  />
                ))
              }
            </div>
          </div>
        );
      })}
    </div>
  );
};