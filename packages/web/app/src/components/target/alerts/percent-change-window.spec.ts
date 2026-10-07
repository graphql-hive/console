import { percentChangeWindowFits, percentChangeWindowReason } from './percent-change-window';

const DAY = 24 * 60;

describe('percentChangeWindowFits', () => {
  it('needs twice the window inside the retention', () => {
    expect(percentChangeWindowFits(7 * DAY, 7)).toBe(false);
    expect(percentChangeWindowFits(3 * DAY, 7)).toBe(true);
    expect(percentChangeWindowFits(DAY, 7)).toBe(true);
    expect(percentChangeWindowFits(DAY, 1)).toBe(false);
    expect(percentChangeWindowFits(6 * 60, 1)).toBe(true);
    expect(percentChangeWindowFits(7 * DAY, 90)).toBe(true);
  });

  it('restricts nothing until the retention is known', () => {
    expect(percentChangeWindowFits(7 * DAY)).toBe(true);
  });
});

describe('percentChangeWindowReason', () => {
  it('names the window, the history it needs and what the organization keeps', () => {
    expect(percentChangeWindowReason(7 * DAY, 7)).toBe(
      '% change over 7 days needs 14 days of history; this organization keeps 7 days.',
    );
    expect(percentChangeWindowReason(DAY, 1)).toBe(
      '% change over 1 day needs 2 days of history; this organization keeps 1 day.',
    );
  });

  it('speaks in hours and minutes below a day', () => {
    expect(percentChangeWindowReason(6 * 60, 1)).toMatch(/^% change over 6 hours needs 12 hours/);
    expect(percentChangeWindowReason(30, 1)).toMatch(/^% change over 30 minutes needs 1 hour /);
  });
});
