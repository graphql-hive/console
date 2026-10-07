const DAY_IN_MINUTES = 24 * 60;

export const VIEW_RANGE_OPTIONS = [
  { value: '60', label: 'Last 1 hour' },
  { value: '360', label: 'Last 6 hours' },
  { value: '1440', label: 'Last 24 hours' },
  { value: '10080', label: 'Last 7 days' },
  { value: '43200', label: 'Last 30 days' },
] as const;

export type ViewRangeOption = (typeof VIEW_RANGE_OPTIONS)[number];

// The ranges the plan keeps; all of them until the retention is known.
export function viewRangeOptions(retentionInDays?: number): readonly ViewRangeOption[] {
  if (retentionInDays === undefined) {
    return VIEW_RANGE_OPTIONS;
  }
  return VIEW_RANGE_OPTIONS.filter(
    option => parseInt(option.value, 10) <= retentionInDays * DAY_IN_MINUTES,
  );
}

// The selection, or the longest range left when the plan no longer offers it.
export function viewRangeWithin(
  options: readonly ViewRangeOption[],
  selected: string,
): ViewRangeOption['value'] {
  return (
    options.find(option => option.value === selected)?.value ?? options[options.length - 1].value
  );
}
