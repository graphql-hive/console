import { useMemo } from 'react';
import type { MenuEntryList, MenuSection } from '@/components/base/floating/menu/menu';

export type SavedFilterView = {
  id: string;
  name: string;
  viewerCanUpdate: boolean;
  filters: {
    operationHashes: string[];
    clientFilters: Array<{ name: string; versions: string[] | null }>;
    dateRange: { from: string; to: string } | null;
    excludeOperations: boolean;
    excludeClientFilters: boolean;
  };
};

function savedFilterEntries({
  savedFilters,
  emptyMessage,
  onApplySavedFilter,
}: {
  savedFilters: SavedFilterView[];
  emptyMessage: string;
  onApplySavedFilter: (view: SavedFilterView) => void;
}): MenuEntryList {
  if (savedFilters.length === 0) {
    return [{ label: emptyMessage, disabled: true }];
  }

  return savedFilters.map(savedFilter => ({
    label: savedFilter.name,
    onClick: () => onApplySavedFilter(savedFilter),
  }));
}

/**
 * Returns the extra menu sections specific to Insights — saved-filter
 * sub-menus (private + shared) and the "Manage saved filters" navigation
 * link. Hand the result to `<Filters extraSections={...}>`.
 */
export function useInsightsFilterExtraSections({
  privateSavedFilterViews,
  sharedSavedFilterViews,
  onApplySavedFilter,
  onManageSavedFilters,
}: {
  privateSavedFilterViews: SavedFilterView[];
  sharedSavedFilterViews: SavedFilterView[];
  onApplySavedFilter: (view: SavedFilterView) => void;
  onManageSavedFilters?: () => void;
}): MenuSection[] {
  return useMemo<MenuSection[]>(
    () => [
      [
        {
          kind: 'submenu',
          label: 'My saved filters',
          items: [
            savedFilterEntries({
              savedFilters: privateSavedFilterViews,
              emptyMessage: 'No saved private views',
              onApplySavedFilter,
            }),
          ],
        },
        {
          kind: 'submenu',
          label: 'Shared saved filters',
          items: [
            savedFilterEntries({
              savedFilters: sharedSavedFilterViews,
              emptyMessage: 'No saved shared views',
              onApplySavedFilter,
            }),
          ],
        },
      ],
      [
        onManageSavedFilters && {
          label: 'Manage saved filters',
          variant: 'navigationLink' as const,
          onClick: onManageSavedFilters,
        },
      ],
    ],
    [privateSavedFilterViews, sharedSavedFilterViews, onApplySavedFilter, onManageSavedFilters],
  );
}
