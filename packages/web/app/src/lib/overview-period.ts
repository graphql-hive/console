import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { subDays } from '@/lib/date-time';
import { UTCDate } from '@date-fns/utc';

const window = 14;

// The overviews' window: the last 14 whole days, or fewer when the plan keeps less, one point per day.
export function overviewPeriod(now: UTCDate = new UTCDate(), retentionInDays = window) {
  const days = Math.min(window, retentionInDays);
  return {
    period: { from: formatISO(startOfDay(subDays(now, days))), to: formatISO(endOfDay(now)) },
    resolution: days,
  };
}
