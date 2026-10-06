import { pluralize } from '@/lib/utils';

const DAY_IN_MINUTES = 24 * 60;

// A "% change" rule reads its window and the one before it, so the plan has to keep both.
export function percentChangeWindowFits(
  timeWindowMinutes: number,
  retentionInDays?: number,
): boolean {
  return (
    retentionInDays === undefined || timeWindowMinutes * 2 <= retentionInDays * DAY_IN_MINUTES
  );
}

// Why a window cannot be picked: the option's tooltip and the message under the field.
export function percentChangeWindowReason(
  timeWindowMinutes: number,
  retentionInDays: number,
): string {
  return `% change over ${spanLabel(timeWindowMinutes)} needs ${spanLabel(timeWindowMinutes * 2)} of history; this organization keeps ${withUnit(retentionInDays, 'day')}.`;
}

function spanLabel(minutes: number): string {
  if (minutes % DAY_IN_MINUTES === 0) {
    return withUnit(minutes / DAY_IN_MINUTES, 'day');
  }
  if (minutes % 60 === 0) {
    return withUnit(minutes / 60, 'hour');
  }
  return withUnit(minutes, 'minute');
}

function withUnit(count: number, unit: string): string {
  return `${count} ${pluralize(count, unit, `${unit}s`)}`;
}
