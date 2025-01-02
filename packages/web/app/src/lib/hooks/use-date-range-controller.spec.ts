import { UTCDate } from '@date-fns/utc';
import { parse } from '../date-math';
import { resolveRangeAndResolution } from './use-date-range-controller';

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
