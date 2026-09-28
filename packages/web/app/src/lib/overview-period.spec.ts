import { UTCDate } from '@date-fns/utc';
import { overviewPeriod } from './overview-period';

describe('overviewPeriod', () => {
  it('spans the 14 whole UTC days up to the end of today, one point per day', () => {
    expect(overviewPeriod(new UTCDate('2026-09-28T15:30:45.000Z'))).toEqual({
      period: { from: '2026-09-14T00:00:00Z', to: '2026-09-28T23:59:59Z' },
      resolution: 14,
    });
  });

  it('is stable within a day, so the page and its loader agree', () => {
    const morning = overviewPeriod(new UTCDate('2026-09-28T00:00:01.000Z'));
    const night = overviewPeriod(new UTCDate('2026-09-28T23:59:58.000Z'));
    expect(night).toEqual(morning);
  });
});
