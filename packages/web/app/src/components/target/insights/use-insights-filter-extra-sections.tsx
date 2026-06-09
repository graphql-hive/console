import { useMemo, type ReactNode } from 'react';
import { Menu, MenuItem } from '@/components/base/floating/menu/menu';

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

function SavedFiltersList({
  savedFilters,
  emptyMessage,
  onApplySavedFilter,
}: {
  savedFilters: SavedFilterView[];
  emptyMessage: string;
  onApplySavedFilter: (view: SavedFilterView) => void;
}) {
  if (savedFilters.length === 0) {
    return <MenuItem disabled>{emptyMessage}</MenuItem>;
  }

  return (
    <>
      {savedFilters.map(savedFilter => (
        <MenuItem key={savedFilter.id} onClick={() => onApplySavedFilter(savedFilter)}>
          {savedFilter.name}
        </MenuItem>
      ))}
    </>
  );
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
}): Array<ReactNode | ReactNode[]> {
  return useMemo<Array<ReactNode | ReactNode[]>>(
    () => [
      [
        <Menu
          key="private"
          trigger={<MenuItem>My saved filters</MenuItem>}
          sections={[
            <SavedFiltersList
              key="list"
              savedFilters={privateSavedFilterViews}
              emptyMessage="No saved private views"
              onApplySavedFilter={onApplySavedFilter}
            />,
          ]}
        />,
        <Menu
          key="shared"
          trigger={<MenuItem>Shared saved filters</MenuItem>}
          sections={[
            <SavedFiltersList
              key="list"
              savedFilters={sharedSavedFilterViews}
              emptyMessage="No saved shared views"
              onApplySavedFilter={onApplySavedFilter}
            />,
          ]}
        />,
      ],
      ...(onManageSavedFilters
        ? [
            <MenuItem key="manage" variant="navigationLink" onClick={onManageSavedFilters}>
              Manage saved filters
            </MenuItem>,
          ]
        : []),
    ],
    [privateSavedFilterViews, sharedSavedFilterViews, onApplySavedFilter, onManageSavedFilters],
  );
}
