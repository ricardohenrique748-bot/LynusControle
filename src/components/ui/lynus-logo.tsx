import React, { useEffect, useId, useState } from 'react';

// Geometry measured from the original artwork (Logo/), in a 574x205 viewBox
const COL_X = [18, 51, 84, 117, 150];
const ROW_Y = [174, 143, 112, 80, 49, 18]; // bottom row first
const BRAND_LEVELS = [4, 2, 6, 5, 4]; // squares per column in the official logo
const MAX_LEVEL = ROW_Y.length;
const SIZE = 24;
const RADIUS = 5;
const BLUE = '#6B8AFF';
const CYAN = '#36D0E8';

// Equalizer timing
const TICK_MS = 140;
const PLAY_MS = 5200; // dancing
const HOLD_MS = 2600; // resting on the brand shape

function randomLevel() {
  return 1 + Math.floor(Math.random() * MAX_LEVEL);
}

// Each column steps one square at a time toward a random target, then the whole icon
// settles back on the brand shape for a moment before dancing again.
function useEqualizer(animated: boolean) {
  const [levels, setLevels] = useState(BRAND_LEVELS);

  useEffect(() => {
    // Intentionally not gated on prefers-reduced-motion: the owner wants the icon always animated
    if (!animated) return;

    let targets = BRAND_LEVELS.map(randomLevel);
    let phase: 'play' | 'settle' | 'hold' = 'hold';
    let phaseStart = Date.now() - HOLD_MS + 900; // short brand pose on first paint

    const id = window.setInterval(() => {
      const now = Date.now();

      if (phase === 'hold' && now - phaseStart >= HOLD_MS) {
        phase = 'play';
        phaseStart = now;
      } else if (phase === 'play' && now - phaseStart >= PLAY_MS) {
        phase = 'settle';
        targets = [...BRAND_LEVELS];
      }

      setLevels((prev) => {
        const next = prev.map((level, col) => {
          if (phase === 'play' && level === targets[col]) targets[col] = randomLevel();
          const target = targets[col];
          return level === target ? level : level + Math.sign(target - level);
        });
        if (phase === 'settle' && next.every((l, i) => l === BRAND_LEVELS[i])) {
          phase = 'hold';
          phaseStart = now;
        }
        return next;
      });
    }, TICK_MS);

    return () => window.clearInterval(id);
  }, [animated]);

  return levels;
}

interface LynusLogoProps {
  className?: string;
  /** Show the "LYNUS" wordmark next to the icon */
  withWordmark?: boolean;
  /** Run the equalizer animation on the icon */
  animated?: boolean;
  title?: string;
}

export function LynusLogo({ className, withWordmark = true, animated = true, title = 'Lynus' }: LynusLogoProps) {
  const glowId = `lynus-glow-${useId().replace(/:/g, '')}`;
  const levels = useEqualizer(animated);
  const width = withWordmark ? 574 : 192;

  return (
    <svg
      viewBox={`0 0 ${width} 205`}
      className={`lynus-logo ${className ?? ''}`}
      role="img"
      aria-label={title}
    >
      <defs>
        <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {COL_X.map((x, col) =>
        ROW_Y.map((y, row) => {
          const level = levels[col];
          const isPeak = row === level - 1;
          return (
            <rect
              key={`${col}-${row}`}
              className="lynus-sq"
              x={x}
              y={y}
              width={SIZE}
              height={SIZE}
              rx={RADIUS}
              fill={isPeak ? CYAN : BLUE}
              filter={isPeak ? `url(#${glowId})` : undefined}
              opacity={row < level ? 1 : 0}
            />
          );
        })
      )}

      {withWordmark && (
        <image className="lynus-word" href="/lynus-wordmark.png" x="210" y="0" width="364" height="205" />
      )}
    </svg>
  );
}
