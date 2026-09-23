import { useCallback } from 'react';
import { Navigation, type NavigationItem } from '@/components/base/navigation/navigation';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { useSlugs } from '@/lib/hooks';
import { useLocation } from '@tanstack/react-router';
import { usePeriodSelector } from './provider';

export function DateRangeFilter() {
  const periodSelector = usePeriodSelector();
  const validUnits = ['y', 'M', 'w', 'd'] as const;
  const onUpdate = useCallback(
    (value: { preset: { range: { from: string; to: string } } }) => {
      periodSelector.setPeriod(value.preset.range);
    },
    [periodSelector],
  );

  return (
    <DateRangePicker
      size="compact"
      validUnits={[...validUnits]}
      onUpdate={onUpdate}
      selectedRange={periodSelector.period}
      startDate={periodSelector.startDate}
      align="start"
    />
  );
}

const variants: Array<{
  value: 'all' | 'unused' | 'deprecated';
  label: string;
  pathname: NonNullable<NavigationItem['to']>;
  tooltip: string;
}> = [
  {
    value: 'all',
    label: 'All',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer',
    tooltip: 'Shows all types, including unused and deprecated ones',
  },
  {
    value: 'unused',
    label: 'Unused',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer/unused',
    tooltip: 'Shows only types that are not used in any operation',
  },
  {
    value: 'deprecated',
    label: 'Deprecated',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated',
    tooltip: 'Shows only types that are marked as deprecated',
  },
];

export function SchemaVariantFilter() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { search } = useLocation();
  return (
    <Navigation
      aria-label="Type filter"
      variant="pill"
      size="sm"
      items={variants.map(variant => ({
        id: variant.value,
        label: variant.label,
        tooltip: variant.tooltip,
        to: variant.pathname,
        // All is the parent path of the other two.
        exact: variant.value === 'all',
        params: {
          organizationSlug,
          projectSlug,
          targetSlug,
        },
        search,
      }))}
    />
  );
}
