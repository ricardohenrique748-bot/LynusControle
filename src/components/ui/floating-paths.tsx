import React, { useMemo } from 'react';
import { cn } from '../../lib/utils.ts';

/**
 * Animated flowing lines behind `children`.
 * `position` (1 or -1) mirrors the curves; stack two instances for the crossed effect.
 * Lines use `currentColor`, set through `pathsClassName` (defaults to a light tone for the dark UI).
 *
 * Performance: the lines are painted once and only the whole layer moves (transform/opacity),
 * which the GPU compositor handles without repainting. Animating the strokes themselves
 * (pathLength / stroke-dashoffset) forced full-screen repaints every frame and left parts of
 * the page (logo, text) blank.
 */
export function FloatingPathsBackground({
  position,
  children,
  className,
  pathsClassName = 'text-slate-300',
  count = 36,
}: {
  position: number;
  className?: string;
  pathsClassName?: string;
  /** Number of lines (painted once, so the count does not affect animation cost) */
  count?: number;
  children?: React.ReactNode;
}) {
  // Spread `count` lines over the original 36-line fan
  const paths = useMemo(
    () =>
      Array.from({ length: count }, (_, n) => {
        const i = Math.round((n * 35) / Math.max(1, count - 1));
        return {
          id: i,
          d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${380 - i * 5 * position} -${189 + i * 6} -${
            312 - i * 5 * position
          } ${216 - i * 6} ${152 - i * 5 * position} ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
          } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
          width: 0.5 + i * 0.03,
        };
      }),
    [position, count]
  );

  return (
    <div className={cn('w-full relative', className)}>
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={cn('floating-paths-layer absolute -inset-[6%]', position < 0 && 'floating-paths-reverse')}>
          <svg className={cn('w-full h-full', pathsClassName)} viewBox="0 0 696 316" fill="none">
            {paths.map((path) => (
              <path
                key={path.id}
                d={path.d}
                stroke="currentColor"
                strokeWidth={path.width}
                strokeOpacity={Math.min(1, 0.1 + path.id * 0.03)}
              />
            ))}
          </svg>
        </div>
      </div>
      {children}
    </div>
  );
}
