import { previewWindowMinutes } from './preview-window';

const DAY = 24 * 60;

describe('previewWindowMinutes', () => {
  it('is twice the rule window, capped at two weeks', () => {
    expect(previewWindowMinutes('60')).toBe(120);
    expect(previewWindowMinutes('10080')).toBe(14 * DAY);
    expect(previewWindowMinutes('20160')).toBe(14 * DAY);
  });

  it('never reaches past what the plan keeps', () => {
    expect(previewWindowMinutes('10080', 7)).toBe(7 * DAY);
    expect(previewWindowMinutes('60', 7)).toBe(120);
    expect(previewWindowMinutes('10080', 90)).toBe(14 * DAY);
  });

  it('falls back to a week-long window when the input is not a number', () => {
    expect(previewWindowMinutes('')).toBe(14 * DAY);
    expect(previewWindowMinutes('', 7)).toBe(7 * DAY);
  });
});
