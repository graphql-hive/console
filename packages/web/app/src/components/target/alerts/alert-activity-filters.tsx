import { useState } from 'react';
import { ListFilter } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import type {
  FilterItem,
  FilterSelection,
} from '@/components/base/floating/filter-dropdown/types';
import {
  FilterChips,
  FilterMenu,
  type FilterDimension,
} from '@/components/base/floating/filter-menu/filter-menu';
import { MetricAlertRuleSeverity, MetricAlertRuleType } from '@/gql/graphql';

const SEVERITY_OPTIONS: Array<{ value: MetricAlertRuleSeverity; label: string }> = [
  { value: MetricAlertRuleSeverity.Critical, label: 'Critical' },
  { value: MetricAlertRuleSeverity.Warning, label: 'Warning' },
  { value: MetricAlertRuleSeverity.Info, label: 'Info' },
];

const TYPE_OPTIONS: Array<{ value: MetricAlertRuleType; label: string }> = [
  { value: MetricAlertRuleType.ErrorRate, label: 'Reliability' },
  { value: MetricAlertRuleType.Latency, label: 'Latency' },
  { value: MetricAlertRuleType.Traffic, label: 'Traffic' },
];

export type ActivityFilters = {
  severities: ReadonlySet<MetricAlertRuleSeverity>;
  types: ReadonlySet<MetricAlertRuleType>;
  createdByIds: ReadonlySet<string>;
};

export const EMPTY_ACTIVITY_FILTERS: ActivityFilters = {
  severities: new Set(),
  types: new Set(),
  createdByIds: new Set(),
};

export function activityFiltersCount(filters: ActivityFilters): number {
  return filters.severities.size + filters.types.size + filters.createdByIds.size;
}

type CreatedByUser = { id: string; displayName: string };

const SEVERITY_ITEMS: FilterItem[] = SEVERITY_OPTIONS.map(o => ({
  id: o.value,
  name: o.label,
  values: [],
}));

const TYPE_ITEMS: FilterItem[] = TYPE_OPTIONS.map(o => ({
  id: o.value,
  name: o.label,
  values: [],
}));

function setToSelections<T extends string>(
  set: ReadonlySet<T>,
  items: FilterItem[],
): FilterSelection[] {
  if (set.size === 0) return [];
  return items
    .filter(item => set.has((item.id ?? item.name) as T))
    .map(item => ({ id: item.id, name: item.name, values: null }));
}

function selectionsToSet<T extends string>(selections: FilterSelection[]): Set<T> {
  return new Set(selections.map(s => (s.id ?? s.name) as T));
}

type SharedProps = {
  value: ActivityFilters;
  onChange: (next: ActivityFilters) => void;
  createdByUsers: ReadonlyArray<CreatedByUser>;
};

/**
 * Build the FilterDimension array describing the activity-page filters.
 * Used by both the FilterMenu trigger and the FilterChips so the menu and
 * chips stay in sync from a single source of truth.
 */
function useActivityDimensions({
  value,
  onChange,
  createdByUsers,
}: SharedProps): FilterDimension[] {
  const createdByItems: FilterItem[] = createdByUsers.map(u => ({
    id: u.id,
    name: u.displayName,
    values: [],
  }));

  const dimensions: FilterDimension[] = [
    {
      key: 'severity',
      label: 'Severity',
      items: SEVERITY_ITEMS,
      selectedItems: setToSelections(value.severities, SEVERITY_ITEMS),
      onChange: sel =>
        onChange({ ...value, severities: selectionsToSet<MetricAlertRuleSeverity>(sel) }),
    },
    {
      key: 'type',
      label: 'Type',
      items: TYPE_ITEMS,
      selectedItems: setToSelections(value.types, TYPE_ITEMS),
      onChange: sel => onChange({ ...value, types: selectionsToSet<MetricAlertRuleType>(sel) }),
    },
  ];

  if (createdByUsers.length > 0) {
    dimensions.push({
      key: 'createdBy',
      label: 'Created by',
      items: createdByItems,
      selectedItems: setToSelections(value.createdByIds, createdByItems),
      onChange: sel => onChange({ ...value, createdByIds: selectionsToSet<string>(sel) }),
    });
  }

  return dimensions;
}

/** "Filter" pill that opens the dimensions menu. Place near the date range. */
export function AlertActivityFilterMenu(props: SharedProps) {
  const [open, setOpen] = useState(false);
  const dimensions = useActivityDimensions(props);

  return (
    <FilterMenu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          label="Filter"
          variant="default"
          rightIcon={{ icon: ListFilter, withSeparator: true }}
        />
      }
      dimensions={dimensions}
    />
  );
}

/** Active-filter chips. Render after fixed-position controls so they don't shove them. */
export function AlertActivityFilterChips(props: SharedProps) {
  const dimensions = useActivityDimensions(props);
  return <FilterChips dimensions={dimensions} />;
}
