import { useState, useEffect } from 'react';
import type { StationGroup } from '@/types/station';

export const useScrollSpy = (groupIds: StationGroup[]): StationGroup | null => {
  const [activeGroup, setActiveGroup] = useState<StationGroup | null>(groupIds[0] ?? null);

  useEffect(() => {
    if (groupIds.length === 0) return;

    const observers: IntersectionObserver[] = [];

    // 记录每个 section 当前的可见比例
    const visibilityMap = new Map<StationGroup, number>();

    groupIds.forEach(id => {
      const el = document.getElementById(`group-${id}`);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          visibilityMap.set(id, entry.intersectionRatio);
          // 取可见比例最高的 group 作为当前活跃项
          let maxRatio = 0;
          let maxId: StationGroup | null = null;
          visibilityMap.forEach((ratio, gid) => {
            if (ratio > maxRatio) {
              maxRatio = ratio;
              maxId = gid;
            }
          });
          if (maxId !== null) setActiveGroup(maxId);
        },
        { threshold: [0, 0.1, 0.2, 0.5, 1.0], rootMargin: '-10% 0px -60% 0px' }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach(o => o.disconnect());
  }, [groupIds]);

  return activeGroup;
};
