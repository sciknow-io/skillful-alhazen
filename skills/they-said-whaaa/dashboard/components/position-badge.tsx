'use client';

export type Position = 'for' | 'against' | 'neutral' | 'unclear' | null | undefined;

const POSITION_STYLES: Record<string, string> = {
  for: 'bg-green-500/15 text-green-400 border-green-500/30',
  against: 'bg-red-500/15 text-red-400 border-red-500/30',
  neutral: 'bg-gray-500/15 text-gray-400 border-gray-500/30',
  unclear: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
};

const POSITION_LABELS: Record<string, string> = {
  for: 'For',
  against: 'Against',
  neutral: 'Neutral',
  unclear: 'Unclear',
};

interface PositionBadgeProps {
  position: Position;
  className?: string;
}

export function PositionBadge({ position, className = '' }: PositionBadgeProps) {
  const key = position?.toLowerCase() ?? 'unclear';
  const style = POSITION_STYLES[key] ?? POSITION_STYLES.unclear;
  const label = POSITION_LABELS[key] ?? 'Unclear';

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style} ${className}`}
    >
      {label}
    </span>
  );
}
