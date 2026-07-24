import { formatTimeAgo } from './time-ago';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

// Fixed reference "now"; every case is `now` minus some elapsed time.
const NOW = new Date('2026-07-23T12:00:00.000Z').getTime();
const ago = (elapsedMs: number) => formatTimeAgo(new Date(NOW - elapsedMs), NOW);

describe('formatTimeAgo', () => {
  it('shows "now" under 2 minutes', () => {
    expect(ago(0)).toBe('now');
    expect(ago(30 * SECOND)).toBe('now');
    expect(ago(2 * MINUTE - SECOND)).toBe('now');
  });

  it('shows minutes from 2m up to an hour', () => {
    expect(ago(2 * MINUTE)).toBe('2m ago');
    expect(ago(5 * MINUTE)).toBe('5m ago');
    expect(ago(HOUR - SECOND)).toBe('59m ago');
  });

  it('shows hours from 1h up to a day', () => {
    expect(ago(HOUR)).toBe('1h ago');
    expect(ago(3 * HOUR)).toBe('3h ago');
    expect(ago(DAY - SECOND)).toBe('23h ago');
  });

  it('shows days from 1d up to a week', () => {
    expect(ago(DAY)).toBe('1d ago');
    expect(ago(6 * DAY)).toBe('6d ago');
    expect(ago(WEEK - SECOND)).toBe('6d ago');
  });

  it('rolls up to weeks from 1w up to a month', () => {
    expect(ago(WEEK)).toBe('1w ago');
    expect(ago(3 * WEEK)).toBe('3w ago');
    expect(ago(MONTH - SECOND)).toBe('4w ago');
  });

  it('rolls up to months from 1mo up to a year', () => {
    expect(ago(MONTH)).toBe('1mo ago');
    expect(ago(2 * MONTH)).toBe('2mo ago');
    expect(ago(YEAR - SECOND)).toBe('12mo ago');
  });

  it('rolls up to years past a year, so old dates stay readable', () => {
    expect(ago(YEAR)).toBe('1y ago');
    expect(ago(Math.floor(2.5 * YEAR))).toBe('2y ago');
    expect(ago(5 * YEAR)).toBe('5y ago');
  });
});
