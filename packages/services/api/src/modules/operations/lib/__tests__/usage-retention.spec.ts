import {
  defaultUsagePeriodDays,
  isPeriodWithinRetention,
  retentionBoundary,
} from '../usage-retention';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const now = new Date('2026-09-29T15:30:00.000Z');

function within(from: string | Date, retentionInDays = 7, at = now) {
  return isPeriodWithinRetention({
    period: { from: new Date(from), to: at },
    retentionInDays,
    now: at,
  });
}

describe('retentionBoundary', () => {
  test('is the UTC start of the day one past the retention', () => {
    expect(retentionBoundary({ now, retentionInDays: 7 }).toISOString()).toBe(
      '2026-09-21T00:00:00.000Z',
    );
  });

  test('answers in UTC days whatever zone the instant was written in', () => {
    const sameInstant = new Date('2026-09-29T17:30:00.000+02:00');
    expect(retentionBoundary({ now: sameInstant, retentionInDays: 7 }).toISOString()).toBe(
      '2026-09-21T00:00:00.000Z',
    );
    // 01:30 on the 29th in Athens is still the 28th in UTC, so the boundary is a day earlier.
    const lateEvening = new Date('2026-09-29T01:30:00.000+03:00');
    expect(retentionBoundary({ now: lateEvening, retentionInDays: 7 }).toISOString()).toBe(
      '2026-09-20T00:00:00.000Z',
    );
  });
});

describe('isPeriodWithinRetention', () => {
  test('the boundary instant passes, the millisecond before fails', () => {
    expect(within('2026-09-21T00:00:00.000Z')).toBe(true);
    expect(within('2026-09-20T23:59:59.999Z')).toBe(false);
  });

  test('the edge preset passes exact, rounded to the hour, and from a client clock ahead', () => {
    expect(within(new Date(now.getTime() - 7 * DAY))).toBe(true);
    expect(within('2026-09-22T15:00:00.000Z')).toBe(true);
    expect(within(new Date(now.getTime() + 5 * 60 * 1000 - 7 * DAY))).toBe(true);
  });

  test('a start the console resolved yesterday still passes after midnight', () => {
    // Resolved at 15:00 on the 28th as the start of the hour seven days back.
    const resolvedYesterday = '2026-09-21T15:00:00.000Z';
    expect(within(resolvedYesterday, 7, new Date('2026-09-29T00:00:30.000Z'))).toBe(true);
  });

  test('a start two days past the retention fails', () => {
    expect(within(new Date(now.getTime() - 9 * DAY))).toBe(false);
  });

  test('follows the retention', () => {
    expect(within(new Date(now.getTime() - 90 * DAY), 90)).toBe(true);
    expect(within(new Date(now.getTime() - 92 * DAY), 90)).toBe(false);
    expect(within(new Date(now.getTime() - 364 * DAY), 365)).toBe(true);
  });

  test('only the start matters', () => {
    expect(
      isPeriodWithinRetention({
        period: { from: new Date(now.getTime() - 7 * DAY), to: new Date(now.getTime() + DAY) },
        retentionInDays: 7,
        now,
      }),
    ).toBe(true);
  });
});

describe('defaultUsagePeriodDays', () => {
  test('is a month, capped at the retention', () => {
    expect(defaultUsagePeriodDays(7)).toBe(7);
    expect(defaultUsagePeriodDays(90)).toBe(30);
    expect(defaultUsagePeriodDays(365)).toBe(30);
  });
});
