import { UTCDate } from '@date-fns/utc';
import { parse, units, withinUnits, type DurationUnit } from './date-math';

describe('parse', () => {
  const now = new UTCDate('1996-06-25');
  it('should parse date', () => {
    expect(parse('now-10m', now)?.toISOString()).toEqual('1996-06-24T23:50:00.000Z');
  });
  it('can parse now', () => {
    expect(parse('now', now)?.toISOString()).toEqual('1996-06-25T00:00:00.000Z');
  });
  it('should not parse invalid parse date', () => {
    expect(parse('10m', now)?.toISOString()).toBeUndefined();
  });
  it('should return undefined for invalid date', () => {
    expect(parse('invalid', now)?.toISOString()).toBeUndefined();
  });
});

describe('withinUnits', () => {
  const noMinutes: DurationUnit[] = ['y', 'M', 'w', 'd', 'h'];

  it('accepts an expression in the units offered and rejects one in another', () => {
    expect(withinUnits('now-3h', noMinutes)).toBe(true);
    expect(withinUnits('now-30m', noMinutes)).toBe(false);
    expect(withinUnits('now-1d-15m', noMinutes)).toBe(false);
  });

  it('tells months from minutes', () => {
    expect(withinUnits('now-6M', noMinutes)).toBe(true);
    expect(withinUnits('now-6M', ['d', 'h', 'm'])).toBe(false);
  });

  it('accepts an absolute date and anything when every unit is offered', () => {
    expect(withinUnits('2026-09-29T10:00:00.000Z', ['d'])).toBe(true);
    expect(withinUnits('2026-09-29 10:00', ['d'])).toBe(true);
    expect(withinUnits('now-30m', units)).toBe(true);
  });
});
