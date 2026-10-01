import type { DateRange } from '../../../shared/entities';

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DEFAULT_EXPLORER_USAGE_DAYS = 30;

// The UTC day the retention reaches back to, never the instant: the console rounds and runs ahead.
export function retentionBoundary(args: { now: Date; retentionInDays: number }): Date {
  const boundary = new Date(args.now.getTime() - args.retentionInDays * DAY_IN_MS);
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
