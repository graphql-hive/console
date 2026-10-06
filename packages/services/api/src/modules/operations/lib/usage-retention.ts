import type { DateRange } from '../../../shared/entities';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EXPLORER_USAGE_DAYS = 30;
// A client resolves its start from its own clock, and a page may re-send it after midnight.
const GRACE_DAYS = 1;

// The UTC day one past the retention, never the instant: the console rounds, lags, and re-sends.
export function retentionBoundary(args: { now: Date; retentionInDays: number }): Date {
  const boundary = new Date(args.now.getTime() - (args.retentionInDays + GRACE_DAYS) * DAY_IN_MS);
  // UTC on purpose; date-fns rounds to the local day.
  boundary.setUTCHours(0, 0, 0, 0);
  return boundary;
}

export function isPeriodWithinRetention(args: {
  period: DateRange;
  retentionInDays: number;
  now: Date;
}): boolean {
  return args.period.from.getTime() >= retentionBoundary(args).getTime();
}

// The explorer's window when the caller sends no period.
export function defaultUsagePeriodDays(retentionInDays: number): number {
  return Math.min(DEFAULT_EXPLORER_USAGE_DAYS, retentionInDays);
}
