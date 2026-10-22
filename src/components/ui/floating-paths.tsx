import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { cn } from '../../lib/utils.ts';

/**
 * Animated flowing lines behind `children`.
 * `position` (1 or -1) mirrors the curves; stack two instances for the crossed effect.
 * Lines use `currentColor`, set through `pathsClassName` (defaults to a light tone for the dark UI).
 */
export function FloatingPathsBackground({
  position,
  children,
  className,
  pathsClassName = 'text-slate-300',
}: {
  position: number;
  className?: string;
  pathsClassName?: string;
  children?: React.ReactNode;
}) {
  // Durations are drawn once so re-renders (e.g. typing in a form) don't change the animation
  const paths = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${
          312 - i * 5 * position
        } ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
          684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.5 + i * 0.03,
        duration: 20 + Math.random() * 10,
      })),
    [position]
  );

  return (
    <div className={cn('w-full relative', className)}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <svg
          className={cn('w-full h-full', pathsClassName)}
          viewBox="0 0 696 316"
          fill="none"
        >
          {paths.map((path) => (
            <motion.path
              key={path.id}
              d={path.d}
              stroke="currentColor"
              strokeWidth={path.width}
              strokeOpacity={Math.min(1, 0.1 + path.id * 0.03)}
              initial={{ pathLength: 0.3, opacity: 0.6 }}
              animate={{
                pathLength: 1,
                opacity: [0.3, 0.6, 0.3],
                pathOffset: [0, 1, 0],
              }}
              transition={{
                duration: path.duration,
                repeat: Number.POSITIVE_INFINITY,
                ease: 'linear',
              }}
            />
          ))}
        </svg>
      </div>
      {children}
    </div>
  );
}
