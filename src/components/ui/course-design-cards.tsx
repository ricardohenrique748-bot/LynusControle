import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { MoreVertical, Plus } from 'lucide-react';

export type CardColor = 'green' | 'orange' | 'red' | 'blue';

export interface CardAvatar {
  src?: string;
  alt: string;
  /** Shown when there is no image */
  initials?: string;
}

export interface CardData {
  id: string | number;
  color: CardColor;
  date: string;
  title: React.ReactNode;
  description: React.ReactNode;
  /** 0–100; the bar is hidden when omitted */
  progress?: number;
  /** Text before the bar (defaults to "Progresso") */
  progressCaption?: string;
  /** Text after the bar (defaults to the percentage) */
  progressLabel?: string;
  avatars?: CardAvatar[];
  /** Shown on the footer's left side, after the avatars */
  footerText?: React.ReactNode;
  countdownText: string;
}

interface CardProps {
  data: CardData;
  /** Rendered in the header in place of the default ellipsis icon */
  menu?: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  onCountdownClick?: () => void;
  className?: string;
}

const COLOR_CLASSES: Record<CardColor, { body: string; text: string }> = {
  green: { body: 'bg-course-green', text: 'text-course-green' },
  orange: { body: 'bg-course-orange', text: 'text-course-orange' },
  red: { body: 'bg-course-red', text: 'text-course-red' },
  blue: { body: 'bg-course-blue', text: 'text-course-blue' },
};

const Card: React.FC<CardProps> = ({ data, menu, onAdd, addLabel = 'Adicionar', onCountdownClick, className }) => {
  const {
    color,
    date,
    title,
    description,
    progress,
    progressCaption = 'Progresso',
    progressLabel,
    avatars = [],
    footerText,
    countdownText,
  } = data;
  const colors = COLOR_CLASSES[color];
  const pct = progress === undefined ? undefined : Math.min(100, Math.max(0, progress));

  return (
    <div className={twMerge(clsx('flex flex-col rounded-2xl overflow-hidden bg-course-footer shadow-lg', className))}>
      <div className={clsx('flex flex-col gap-4 p-5 text-white', colors.body)}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-white/85">{date}</span>
          {menu ?? <MoreVertical className="w-5 h-5 text-white/85" aria-hidden />}
        </div>

        <div>
          <h3 className="text-lg font-bold leading-tight">{title}</h3>
          <p className="text-sm text-white/80 mt-0.5">{description}</p>
        </div>

        {pct !== undefined && (
        <div className="flex items-center gap-3 text-xs font-medium">
          <span className="text-white/85">{progressCaption}</span>
          <div
            className="flex-1 h-1.5 rounded-full bg-white/30 overflow-hidden"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
          </div>
          <span className="tabular-nums">{progressLabel ?? `${Math.round(pct)}%`}</span>
        </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 px-5 py-4 mt-auto">
        <div className="flex items-center gap-3 min-w-0">
        <ul className="flex items-center -space-x-2 empty:hidden">
          {avatars.map((a, i) => (
            <li key={i} title={a.alt}>
              {a.src ? (
                <img src={a.src} alt={a.alt} className="w-8 h-8 rounded-full object-cover ring-2 ring-course-footer" />
              ) : (
                <span className="flex w-8 h-8 items-center justify-center rounded-full bg-course-gray-dark text-[11px] font-semibold text-white ring-2 ring-course-footer">
                  {a.initials ?? a.alt.slice(0, 2).toUpperCase()}
                </span>
              )}
            </li>
          ))}
          {onAdd && (
            <li>
              <button
                type="button"
                onClick={onAdd}
                aria-label={addLabel}
                title={addLabel}
                className="flex w-8 h-8 items-center justify-center rounded-full bg-course-gray-medium text-white ring-2 ring-course-footer hover:bg-course-gray-dark transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </li>
          )}
        </ul>
        {footerText && <span className="text-xs text-slate-400 truncate">{footerText}</span>}
        </div>

        {onCountdownClick ? (
          <button
            type="button"
            onClick={onCountdownClick}
            className={clsx('shrink-0 px-3 py-1.5 rounded-full bg-course-gray-dark text-xs font-semibold hover:bg-course-gray-medium transition-colors cursor-pointer', colors.text)}
          >
            {countdownText}
          </button>
        ) : (
          <span className={clsx('shrink-0 px-3 py-1.5 rounded-full bg-course-gray-dark text-xs font-semibold', colors.text)}>
            {countdownText}
          </span>
        )}
      </div>
    </div>
  );
};

export default Card;
