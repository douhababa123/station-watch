import React from 'react';
import type { StationStatus } from '@/types/station';
import dishwasherAnimatedReference from '../../../4.gif';
import finishStationReference from '../../../finishstation.png';
import emptyStationReference from '../../../emptystation.png';
import faultStationReference from '../../../faultstation.svg';

interface DishwasherModel3DProps {
  status: StationStatus;
  progress?: number; // 0-100
  variant?: 'default' | 'corner';
}

export const DishwasherModel3D: React.FC<DishwasherModel3DProps> = ({ status, variant = 'default' }) => {
  const isCorner = variant === 'corner';

  const getStationVisual = (status: StationStatus) => {
    if (status === 'Running') {
      return {
        src: dishwasherAnimatedReference,
        alt: 'running station animation',
        isRunningGif: true,
      };
    }

    if (status === 'Completed') {
      return {
        src: finishStationReference,
        alt: 'completed station',
        isRunningGif: false,
      };
    }

    if (status === 'Fault') {
      return {
        src: faultStationReference,
        alt: 'fault station alert',
        isRunningGif: false,
      };
    }

    return {
      src: emptyStationReference,
      alt: 'empty station',
      isRunningGif: false,
    };
  };

  const visual = getStationVisual(status);

  const containerWidth = isCorner ? 70 : 96;
  const containerHeight = isCorner ? 70 : 84;

  const runningWidth = isCorner ? 136 : 168;
  const runningHeight = isCorner ? 70 : 84;
  const runningTranslateX = isCorner ? -26 : -32;

  const staticWidth = containerWidth;
  const staticHeight = containerHeight;

  return (
    <div className="flex items-center justify-center w-full" style={{ height: isCorner ? '70px' : '96px' }}>
      {/* Running: 4.gif；Completed: finishstation.png；其余空工位: emptystation.png */}
      <div
        className="relative overflow-hidden rounded-lg"
        style={{ width: `${containerWidth}px`, height: `${containerHeight}px` }}
      >
        <img
          src={visual.src}
          alt={visual.alt}
          className="pointer-events-none select-none"
          style={{
            width: `${visual.isRunningGif ? runningWidth : staticWidth}px`,
            height: `${visual.isRunningGif ? runningHeight : staticHeight}px`,
            maxWidth: 'none',
            transform: visual.isRunningGif ? `translateX(${runningTranslateX}px)` : 'translateX(0)',
            objectFit: visual.isRunningGif ? 'cover' : 'contain',
          }}
          draggable={false}
        />
      </div>
    </div>
  );
};
