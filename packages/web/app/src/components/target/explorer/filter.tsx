import { useCallback } from 'react';
import {
  SecondaryNavigation,
  type SecondaryNavigationItem,
} from '@/components/base/navigation/secondary-navigation/secondary-navigation';
import { DateRangePicker } from '@/components/ui/date-range-picker';
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
  pathname: NonNullable<SecondaryNavigationItem['to']>;
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

export function SchemaVariantFilter(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  variant: 'all' | 'unused' | 'deprecated';
}) {
  const { search } = useLocation();
  return (
    <SecondaryNavigation
      aria-label="Type filter"
      variant="pill"
      size="sm"
      value={props.variant}
      items={variants.map(variant => ({
        value: variant.value,
        label: variant.label,
        tooltip: variant.tooltip,
        to: variant.pathname,
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
        search,
      }))}
    />
  );
}
