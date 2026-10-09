import { VIEW_RANGE_OPTIONS, viewRangeOptions, viewRangeWithin } from './view-range-options';

const labels = (retentionInDays?: number) => viewRangeOptions(retentionInDays).map(o => o.label);

describe('viewRangeOptions', () => {
  it('offers every range until the retention is known, then only what the plan keeps', () => {
    expect(labels()).toEqual(VIEW_RANGE_OPTIONS.map(o => o.label));
    expect(labels(7)).toEqual(['Last 1 hour', 'Last 6 hours', 'Last 24 hours', 'Last 7 days']);
    expect(labels(90)).toEqual(VIEW_RANGE_OPTIONS.map(o => o.label));
  });
});

describe('viewRangeWithin', () => {
  it('keeps a selection the plan offers and falls back to the longest range otherwise', () => {
    expect(viewRangeWithin(viewRangeOptions(7), '1440')).toBe('1440');
    expect(viewRangeWithin(viewRangeOptions(7), '43200')).toBe('10080');
  });
});
