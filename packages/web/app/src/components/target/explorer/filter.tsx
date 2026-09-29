import { DateRangePicker, usageUnits } from '@/components/ui/date-range-picker';
import { Navigation, type NavigationItem } from '@/components/ui/navigation/navigation';
import { useSlugs } from '@/lib/hooks';
import type { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { useLocation } from '@tanstack/react-router';

// One picker for the four views: a preset lands in the URL, which the tabs carry between them.
export function DateRangeFilter(props: { controller: ReturnType<typeof useDateRangeController> }) {
  const { controller } = props;
  return (
    <DateRangePicker
      size="compact"
      validUnits={usageUnits}
      selectedRange={controller.selectedPreset.range}
      startDate={controller.startDate}
      align="start"
      onUpdate={({ preset }) => controller.setSelectedPreset(preset)}
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
