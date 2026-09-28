import { endOfDay, formatISO, startOfDay } from 'date-fns';
import { subDays } from '@/lib/date-time';
import { UTCDate } from '@date-fns/utc';

const days = 14;

// The overviews' window: the last 14 whole days, one chart point per day.
export function overviewPeriod(now: UTCDate = new UTCDate()) {
  return {
    period: { from: formatISO(startOfDay(subDays(now, days))), to: formatISO(endOfDay(now)) },
    resolution: days,
  };
}
