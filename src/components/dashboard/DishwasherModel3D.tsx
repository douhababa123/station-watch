import React from 'react';
import type { StationStatus } from '@/types/station';

interface DishwasherModel3DProps {
  status: StationStatus;
  progress?: number; // 0-100
}

// Status → colors
const STATUS_COLORS: Record<StationStatus, { body: string; door: string; glow: string; water: string }> = {
  Running:      { body: '#e0e7ff', door: '#818cf8', glow: '#6366f1', water: '#38bdf8' },
  Completed:    { body: '#d1fae5', door: '#34d399', glow: '#059669', water: '#6ee7b7' },
  Idle:         { body: '#f3f4f6', door: '#9ca3af', glow: '#6b7280', water: '#d1d5db' },
  Fault:        { body: '#fee2e2', door: '#f87171', glow: '#dc2626', water: '#fca5a5' },
  Disconnected: { body: '#fef3c7', door: '#fbbf24', glow: '#b45309', water: '#fde68a' },
};

export const DishwasherModel3D: React.FC<DishwasherModel3DProps> = ({ status, progress = 0 }) => {
  const c = STATUS_COLORS[status] ?? STATUS_COLORS.Idle;
  const isRunning = status === 'Running';
  const isFault = status === 'Fault';

  return (
    <div className="flex items-center justify-center w-full" style={{ height: '96px' }}>
      <svg
        viewBox="0 0 120 100"
        width="120"
        height="100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Glow filter for running */}
          <filter id={`glow-${status}`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Body gradient — top-face */}
          <linearGradient id={`topFace-${status}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor={c.body} />
          </linearGradient>

          {/* Body gradient — front-face */}
          <linearGradient id={`frontFace-${status}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.body} />
            <stop offset="100%" stopColor={c.door} stopOpacity="0.4" />
          </linearGradient>

          {/* Body gradient — right-face */}
          <linearGradient id={`rightFace-${status}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c.door} stopOpacity="0.5" />
            <stop offset="100%" stopColor={c.door} stopOpacity="0.2" />
          </linearGradient>

          {/* Door gradient */}
          <linearGradient id={`door-${status}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.door} stopOpacity="0.9" />
            <stop offset="100%" stopColor={c.glow} />
          </linearGradient>

          {/* Water shimmer */}
          <linearGradient id={`water-${status}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={c.water} stopOpacity="0.7" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor={c.water} stopOpacity="0.7" />
          </linearGradient>

          {/* Shadow under machine */}
          <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#00000022" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* ── Ground shadow ── */}
        <ellipse cx="60" cy="97" rx="38" ry="5" fill="url(#shadow)" />

        {/* ══════════════════════════════
            ISOMETRIC DISHWASHER BODY
            Top face   : parallelogram top
            Front face : rectangle front
            Right face : parallelogram right
        ══════════════════════════════ */}

        {/* RIGHT face (darker side) */}
        <polygon
          points="88,22  104,30  104,80  88,72"
          fill={`url(#rightFace-${status})`}
          stroke={c.door}
          strokeWidth="0.6"
          strokeOpacity="0.5"
        />

        {/* FRONT face */}
        <rect
          x="20" y="30" width="68" height="50"
          rx="2"
          fill={`url(#frontFace-${status})`}
          stroke={c.door}
          strokeWidth="0.6"
          strokeOpacity="0.4"
        />

        {/* TOP face */}
        <polygon
          points="20,30  36,22  104,22  88,30"
          fill={`url(#topFace-${status})`}
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.7"
        />

        {/* ── Door panel (lower 60% of front face) ── */}
        <rect
          x="24" y="48" width="60" height="28"
          rx="2"
          fill={`url(#door-${status})`}
          opacity="0.88"
        />

        {/* Door handle */}
        <rect
          x="26" y="54" width="56" height="3"
          rx="1.5"
          fill="#ffffff"
          opacity="0.5"
        />

        {/* ── Control panel strip (top 35% of front) ── */}
        <rect
          x="24" y="32" width="60" height="14"
          rx="2"
          fill="#ffffff"
          opacity="0.45"
        />

        {/* Control dots */}
        {[33, 43, 53].map((cx, i) => (
          <circle
            key={i}
            cx={cx} cy="39" r="2.5"
            fill={i === 0 ? c.glow : '#cbd5e1'}
            opacity={i === 0 ? '1' : '0.7'}
          >
            {isRunning && i === 0 && (
              <animate attributeName="opacity" values="1;0.3;1" dur="1.2s" repeatCount="indefinite" />
            )}
          </circle>
        ))}

        {/* ── Progress bar on door ── */}
        {(isRunning || status === 'Completed') && (
          <>
            <rect x="28" y="70" width="52" height="3" rx="1.5" fill="#ffffff" opacity="0.25" />
            <rect
              x="28" y="70"
              width={Math.max(2, 52 * (progress / 100))}
              height="3"
              rx="1.5"
              fill="#ffffff"
              opacity="0.85"
            />
          </>
        )}

        {/* ── Spinning drum indicator (visible through door window) ── */}
        <rect x="34" y="57" width="36" height="16" rx="8" fill="#ffffff" opacity="0.12" />
        {isRunning && (
          <g transform="translate(52,65)">
            <circle r="6" fill="none" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.3" />
            <g>
              <line x1="-6" y1="0" x2="6" y2="0" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" />
              <line x1="0" y1="-6" x2="0" y2="6" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.6" />
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0"
                to="360"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </g>
          </g>
        )}

        {/* ── Water spray drops (only when Running) ── */}
        {isRunning && [
          { cx: 36, cy: 63, delay: '0s' },
          { cx: 44, cy: 59, delay: '0.3s' },
          { cx: 52, cy: 64, delay: '0.6s' },
          { cx: 60, cy: 60, delay: '0.15s' },
          { cx: 68, cy: 63, delay: '0.45s' },
        ].map((drop, i) => (
          <circle key={i} cx={drop.cx} cy={drop.cy} r="1.5" fill={c.water} opacity="0">
            <animate
              attributeName="opacity"
              values="0;0.9;0"
              dur="1s"
              begin={drop.delay}
              repeatCount="indefinite"
            />
            <animate
              attributeName="cy"
              values={`${drop.cy};${drop.cy + 4};${drop.cy}`}
              dur="1s"
              begin={drop.delay}
              repeatCount="indefinite"
            />
          </circle>
        ))}

        {/* ── Fault X icon ── */}
        {isFault && (
          <g transform="translate(52,65)">
            <line x1="-5" y1="-5" x2="5" y2="5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            <line x1="5" y1="-5" x2="-5" y2="5" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
          </g>
        )}

        {/* ── Completed checkmark ── */}
        {status === 'Completed' && (
          <g transform="translate(52,65)">
            <polyline
              points="-5,0 -1,4 6,-4"
              stroke="#059669"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </g>
        )}

        {/* ── Highlight sheen on top face ── */}
        <polygon
          points="22,30  38,22.5  65,22.5  50,30"
          fill="#ffffff"
          opacity="0.35"
        />

        {/* ── Right-face edge highlight ── */}
        <line
          x1="88" y1="22" x2="104" y2="30"
          stroke="#ffffff"
          strokeWidth="0.8"
          strokeOpacity="0.6"
        />
      </svg>
    </div>
  );
};
