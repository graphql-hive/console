import { useMemo } from 'react';
import type { FilterDimension, FilterItem } from '@/components/base/floating/filter-menu/types';
import {
  decodeIdSelections,
  encodeIdSelections,
  urlFilterDimension,
} from '@/components/base/floating/filter-menu/url-filter';
import { MetricAlertRuleSeverity, MetricAlertRuleType } from '@/gql/graphql';
import type { useNavigate } from '@tanstack/react-router';
import type { AlertActivitySearchState } from './search-schemas';

const SEVERITY_ITEMS: FilterItem[] = [
  { id: MetricAlertRuleSeverity.Critical, name: 'Critical', values: [] },
  { id: MetricAlertRuleSeverity.Warning, name: 'Warning', values: [] },
  { id: MetricAlertRuleSeverity.Info, name: 'Info', values: [] },
];

const TYPE_ITEMS: FilterItem[] = [
  { id: MetricAlertRuleType.ErrorRate, name: 'Reliability', values: [] },
  { id: MetricAlertRuleType.Latency, name: 'Latency', values: [] },
  { id: MetricAlertRuleType.Traffic, name: 'Traffic', values: [] },
];

type CreatedByUser = { id: string; displayName: string };

/**
 * Builds the FilterDimension array describing the activity-page filters.
 * Each dimension is wired to URL search params via `urlFilterDimension`.
 */
export function useActivityFilterDimensions({
  search,
  navigate,
  createdByUsers,
}: {
  search: AlertActivitySearchState;
  navigate: ReturnType<typeof useNavigate>;
  createdByUsers: ReadonlyArray<CreatedByUser>;
}): FilterDimension[] {
  const createdByItems = useMemo<FilterItem[]>(
    () => createdByUsers.map(u => ({ id: u.id, name: u.displayName, values: [] })),
    [createdByUsers],
  );

  return useMemo<FilterDimension[]>(() => {
    const dimensions: FilterDimension[] = [
      {
        ...urlFilterDimension({
          navigate,
          search,
          searchKey: 'severities',
          key: 'severity',
          label: 'Severity',
          items: SEVERITY_ITEMS,
          encode: encodeIdSelections,
          decode: v => decodeIdSelections(v, SEVERITY_ITEMS),
        }),
        labelPlural: 'severities',
      },
      urlFilterDimension({
        navigate,
        search,
        searchKey: 'types',
        key: 'type',
        label: 'Type',
        items: TYPE_ITEMS,
        encode: encodeIdSelections,
        decode: v => decodeIdSelections(v, TYPE_ITEMS),
      }),
    ];

    if (createdByItems.length > 0) {
      dimensions.push(
        urlFilterDimension({
          navigate,
          search,
          searchKey: 'createdByIds',
          key: 'createdBy',
          label: 'Created by',
          items: createdByItems,
          encode: encodeIdSelections,
          decode: v => decodeIdSelections(v, createdByItems),
        }),
      );
    }

    return dimensions;
  }, [navigate, search.severities, search.types, search.createdByIds, createdByItems]);
}
