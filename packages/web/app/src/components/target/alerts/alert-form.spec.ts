// @vitest-environment jsdom
import { buildAlertFormSchema, DEFAULT_ALERT_FORM_VALUES } from './alert-form';

// The form module pulls in connected components that read the env; jsdom has none.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));

const filled = { ...DEFAULT_ALERT_FORM_VALUES, name: 'Error spike', thresholdValue: '25' };

function rangeIssues(values: typeof filled, retentionInDays?: number): string[] {
  const result = buildAlertFormSchema(retentionInDays).safeParse(values);
  return result.success
    ? []
    : result.error.issues
        .filter(issue => issue.path[0] === 'timeWindowMinutes')
        .map(issue => issue.message);
}

describe('buildAlertFormSchema', () => {
  it('rejects, on the range field, a % change window the retention cannot back', () => {
    expect(
      rangeIssues({ ...filled, thresholdType: 'PERCENTAGE_CHANGE', timeWindowMinutes: '10080' }, 7),
    ).toEqual(['% change over 7 days needs 14 days of history; this organization keeps 7 days.']);
  });

  it('accepts a % change window that fits, and any window for a fixed value', () => {
    expect(
      rangeIssues({ ...filled, thresholdType: 'PERCENTAGE_CHANGE', timeWindowMinutes: '4320' }, 7),
    ).toEqual([]);
    expect(
      rangeIssues({ ...filled, thresholdType: 'FIXED_VALUE', timeWindowMinutes: '10080' }, 7),
    ).toEqual([]);
  });

  it('restricts nothing until the retention is known', () => {
    expect(
      rangeIssues({ ...filled, thresholdType: 'PERCENTAGE_CHANGE', timeWindowMinutes: '10080' }),
    ).toEqual([]);
  });

  it('checks the window before a value is entered', () => {
    expect(
      rangeIssues(
        { ...filled, thresholdValue: '', thresholdType: 'PERCENTAGE_CHANGE', timeWindowMinutes: '10080' },
        7,
      ),
    ).toHaveLength(1);
  });
});
