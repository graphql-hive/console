import { presetLast7Days } from '@/components/ui/date-range-picker';
import { UTCDate } from '@date-fns/utc';
import { parse } from '../date-math';
import {
  announced,
  loaderPeriod,
  longestPresetWithin,
  resolveDateRange,
  resolveRangeAndResolution,
  retentionBoundary,
  startsWithin,
} from './use-date-range-controller';

describe('useDateRangeController', () => {
  const testCases = [
    {
      now: '1992-10-21T10:10:00.000Z',
      from: 'now-1d',
      to: 'now',
      expected: {
        from: '1992-10-20T10:00:00.000Z',
        to: '1992-10-21T10:59:59.999Z', // endOfHour as it cannot use minutely aggregation
      },
    },
    {
      now: '1992-10-21T10:10:12.000Z',
      from: 'now-3h',
      to: 'now',
      expected: {
        from: '1992-10-21T07:10:00.000Z',
        to: '1992-10-21T10:10:59.999Z', // endOfMinute as it can use minutely aggregation
      },
    },
    {
      now: '1992-10-21T10:10:00.000Z',
      from: 'now-2d',
      to: 'now',
      expected: {
        from: '1992-10-19T10:00:00.000Z',
        to: '1992-10-21T10:59:59.999Z', // endOfHour as it cannot use minutely aggregation
      },
    },
    {
      now: '1992-10-21T10:10:00.000Z',
      from: 'now-7d',
      to: 'now',
      expected: {
        from: '1992-10-14T10:00:00.000Z',
        to: '1992-10-21T10:59:59.999Z', // endOfHour as it cannot use minutely aggregation
      },
    },
    //
    //
    // Testing a date range,
    // where potentially daily aggregation will be used.
    // UTC+5:30
    {
      now: '1992-11-07T03:19:59+05:30', // it's 1992-11-06T21:49:59.000Z
      from: 'now-7d',
      to: 'now',
      expected: {
        from: '1992-10-30T21:00:00.000Z',
        to: '1992-11-06T21:59:59.999Z',
      },
    },
    // Testing a date range,
    // where potentially daily aggregation will be used.
    // The same as above but with a different time zone
    {
      now: '1992-11-06T21:49:59.000Z',
      from: 'now-7d',
      to: 'now',
      expected: {
        from: '1992-10-30T21:00:00.000Z',
        to: '1992-11-06T21:59:59.999Z',
      },
    },
    //
    //
    // Testing a date range,
    // where potentially daily aggregation will be used.
    // UTC-4:15
    {
      now: '1992-11-07T03:19:59-04:15', // it's 1992-11-07T07:34:59.000Z
      from: 'now-7d',
      to: 'now',
      expected: {
        from: '1992-10-31T07:00:00.000Z',
        to: '1992-11-07T07:59:59.999Z',
      },
    },
    // Testing a date range,
    // where potentially daily aggregation will be used.
    // The same as above but with a different time zone
    {
      now: '1992-11-07T07:34:59.000Z',
      from: 'now-7d',
      to: 'now',
      expected: {
        from: '1992-10-31T07:00:00.000Z',
        to: '1992-11-07T07:59:59.999Z',
      },
    },
    //
    //
    // Testing a date range,
    // where potentially hourly aggregation will be used.
    // UTC+5:30
    {
      now: '1992-11-07T03:19:59+05:30', // it's 1992-11-06T21:49:59.000Z
      from: 'now-3d',
      to: 'now',
      expected: {
        from: '1992-11-03T21:00:00.000Z',
        to: '1992-11-06T21:59:59.999Z',
      },
    },
    // Testing a date range,
    // where potentially hourly aggregation will be used.
    // The same as above but with a different time zone
    {
      now: '1992-11-06T21:49:59.000Z',
      from: 'now-3d',
      to: 'now',
      expected: {
        from: '1992-11-03T21:00:00.000Z',
        to: '1992-11-06T21:59:59.999Z',
      },
    },
    //
    //
    // Testing a date range,
    // where potentially minutely aggregation will be used.
    // UTC+5:30
    {
      now: '1992-11-07T03:19:59+05:30', // it's 1992-11-06T21:49:59.000Z
      from: 'now-1d',
      to: 'now',
      expected: {
        from: '1992-11-05T21:49:00.000Z',
        to: '1992-11-06T21:49:59.999Z',
      },
    },
    // Testing a date range,
    // where potentially minutely aggregation will be used.
    // The same as above but with a different time zone
    {
      now: '1992-11-06T21:49:59.000Z',
      from: 'now-1d',
      to: 'now',
      expected: {
        from: '1992-11-05T21:49:00.000Z',
        to: '1992-11-06T21:49:59.999Z',
      },
    },
    //
    //
    {
      now: '1992-10-21T10:19:54.000Z',
      from: 'now-7d',
      to: 'now',
      expected: {
        from: '1992-10-14T10:00:00.000Z',
        to: '1992-10-21T10:59:59.999Z', // endOfHour as it cannot use minutely aggregation
      },
    },
    {
      now: '1992-10-21T10:10:00.000Z',
      from: 'now-48d',
      to: 'now',
      expected: {
        from: '1992-09-03T00:00:00.000Z',
        to: '1992-10-21T23:59:59.999Z', // endOfDay as it cannot use minutely aggregation
      },
    },
    {
      now: '1992-10-21T10:10:00.000Z',
      from: 'now-48d', // 1992-09-03
      to: 'now-7d', // 1992-10-14
      expected: {
        from: '1992-09-03T00:00:00.000Z',
        to: '1992-10-14T23:59:59.999Z', // endOfDay as it cannot use minutely aggregation
      },
    },
  ];

  for (const testCase of testCases) {
    test(`${testCase.now} -> ${testCase.from} to ${testCase.to}`, () => {
      const now = new UTCDate(testCase.now);
      const result = resolveRangeAndResolution(
        {
          from: parse(testCase.from, now)!,
          to: parse(testCase.to, now)!,
        },
        now,
      );
      expect(result).toEqual(
        expect.objectContaining({
          range: {
            from: new Date(testCase.expected.from),
            to: new Date(testCase.expected.to),
          },
        }),
      );
    });
  }
});

describe('resolveDateRange', () => {
  const now = new UTCDate('1992-10-22T10:10:00.000Z');
  const iso = (value: string) => new Date(value).toISOString();

  it('names the preset the URL spells out', () => {
    const { selectedPreset } = resolveDateRange(
      { from: 'now-7d', to: 'now', defaultPreset: presetLast7Days },
      now,
    );
    expect(selectedPreset.name).toBe('last7d');
  });

  it('builds a custom preset for a range that is not one', () => {
    const from = '1992-10-01T00:00:00.000Z';
    const to = '1992-10-15T00:00:00.000Z';
    const { selectedPreset } = resolveDateRange({ from, to, defaultPreset: presetLast7Days }, now);
    expect(selectedPreset.name).toBe(`${from}_${to}`);
    expect(selectedPreset.range).toEqual({ from, to });
  });

  it('falls back to the default preset when the URL has no range or one it cannot read', () => {
    expect(resolveDateRange({ defaultPreset: presetLast7Days }, now).selectedPreset).toBe(
      presetLast7Days,
    );
    expect(
      resolveDateRange({ from: 'yesterday-ish', to: 'now', defaultPreset: presetLast7Days }, now)
        .selectedPreset,
    ).toBe(presetLast7Days);
  });

  it('widens a range with equal ends to a day', () => {
    const at = '1992-10-21T12:00:00.000Z';
    const { range } = resolveDateRange({ from: at, to: at, defaultPreset: presetLast7Days }, now);
    expect(iso(range.from)).toBe('1992-10-21T12:00:00.000Z');
    expect(iso(range.to)).toBe('1992-10-22T11:59:59.000Z');
  });

  it('gives the same variables for the same input and clock', () => {
    const args = { from: 'now-7d', to: 'now', defaultPreset: presetLast7Days };
    const first = resolveDateRange(args, now);
    expect(resolveDateRange(args, now)).toEqual(first);
    expect(iso(first.range.from)).toBe('1992-10-15T10:00:00.000Z');
    expect(iso(first.range.to)).toBe('1992-10-22T10:59:59.000Z');
  });
});

describe('loaderPeriod', () => {
  const now = new UTCDate('1992-10-22T10:10:00.000Z');

  it('is the resolved range in the shape a loader returns, ignoring other deps', () => {
    const deps = { from: 'now-7d', to: 'now', operations: ['abc'] };
    const { period, resolution } = loaderPeriod(deps, presetLast7Days, now);
    expect(new Date(period.from).toISOString()).toBe('1992-10-15T10:00:00.000Z');
    expect(new Date(period.to).toISOString()).toBe('1992-10-22T10:59:59.000Z');
    expect(resolution).toBe(90);
  });

  it('takes the default preset for a bare URL', () => {
    expect(loaderPeriod({}, presetLast7Days, now)).toEqual(
      loaderPeriod(presetLast7Days.range, presetLast7Days, now),
    );
  });
});

describe('announced', () => {
  // A Map standing in for sessionStorage, which a node spec has none of.
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => store.set(key, value),
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('remembers every entry announced, not just the last one', () => {
    expect(announced('a')).toBe(false);
    expect(announced('a')).toBe(true);
    expect(announced('b')).toBe(false);
    // Back to the first entry: still announced.
    expect(announced('a')).toBe(true);
  });

  it('forgets the oldest entries past twenty', () => {
    for (let i = 0; i < 21; i++) {
      announced(`entry-${i}`);
    }
    expect(announced('entry-1')).toBe(true);
    expect(announced('entry-0')).toBe(false);
  });

  it('announces every time when storage is unavailable', () => {
    vi.stubGlobal('sessionStorage', undefined);
    expect(announced('a')).toBe(false);
    expect(announced('a')).toBe(false);
  });
});

describe('startsWithin', () => {
  const now = new UTCDate('2026-09-29T15:30:00.000Z');
  const boundary = retentionBoundary(7, now);

  it('keeps a saved range inside the retention and drops one before it or unreadable', () => {
    expect(startsWithin({ from: 'now-7d' }, boundary, now)).toBe(true);
    expect(startsWithin({ from: '2026-09-22T00:00:00.000Z' }, boundary, now)).toBe(true);
    expect(startsWithin({ from: 'now-30d' }, boundary, now)).toBe(false);
    expect(startsWithin({ from: 'garbage' }, boundary, now)).toBe(false);
  });
});

describe('longestPresetWithin', () => {
  const now = new Date('2026-09-29T15:30:00.000Z');

  it('is the longest preset the retention covers', () => {
    expect(longestPresetWithin(7, now).label).toBe('Last 7 days');
    expect(longestPresetWithin(3, now).label).toBe('Last 24 hours');
    expect(longestPresetWithin(90, now).label).toBe('Last 90 days');
    expect(longestPresetWithin(365, now).label).toBe('Last 1 year');
  });
});

describe('retentionBoundary', () => {
  const now = new Date('2026-09-29T15:30:00.000Z');
  const boundary = retentionBoundary(7, now);

  it('is the UTC start of the day the retention reaches back to', () => {
    expect(boundary.toISOString()).toBe('2026-09-22T00:00:00.000Z');
  });

  it('admits the edge preset whether exact or rounded to the hour, and refuses the day before', () => {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(sevenDaysAgo.getTime()).toBeGreaterThanOrEqual(boundary.getTime());
    expect(Date.parse('2026-09-22T15:00:00.000Z')).toBeGreaterThanOrEqual(boundary.getTime());
    expect(Date.parse('2026-09-21T23:59:59.999Z')).toBeLessThan(boundary.getTime());
  });
});
