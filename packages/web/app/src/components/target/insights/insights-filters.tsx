import { useState } from 'react';
import { ListFilter, X } from 'lucide-react';
import { Button } from '@/components/base/button/button';
import {
  FilterMenu,
  type FilterDimension,
} from '@/components/base/floating/filter-menu/filter-menu';
import type {
  FilterItem,
  FilterSelection,
} from '@/components/base/floating/filter-dropdown/types';
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

type InsightsFiltersProps = {
  clientFilterItems: FilterItem[];
  clientFilterSelections: FilterSelection[];
  operationFilterItems: FilterItem[];
  operationFilterSelections: FilterSelection[];
  privateSavedFilterViews: SavedFilterView[];
  sharedSavedFilterViews: SavedFilterView[];
  setClientSelections: (value: FilterSelection[]) => void;
  setOperationSelections: (value: FilterSelection[]) => void;
  onApplySavedFilters: (view: SavedFilterView) => void;
  onManageSavedFilters?: () => void;
  activeViewId?: string;
  onClearActiveView?: () => void;
};

function SavedFiltersList({
  savedFilters,
  emptyMessage,
  onApplySavedFilters,
}: {
  savedFilters: SavedFilterView[];
  emptyMessage: string;
  onApplySavedFilters: (view: SavedFilterView) => void;
}) {
  if (savedFilters.length === 0) {
    return <MenuItem disabled>{emptyMessage}</MenuItem>;
  }

  return (
    <>
      {savedFilters.map(savedFilter => (
        <MenuItem key={savedFilter.id} onClick={() => onApplySavedFilters(savedFilter)}>
          {savedFilter.name}
        </MenuItem>
      ))}
    </>
  );
}

export function InsightsFilters({
  clientFilterItems,
  clientFilterSelections,
  operationFilterItems,
  operationFilterSelections,
  privateSavedFilterViews,
  sharedSavedFilterViews,
  setClientSelections,
  setOperationSelections,
  onApplySavedFilters,
  onManageSavedFilters,
  activeViewId,
  onClearActiveView,
}: InsightsFiltersProps) {
  const [open, setOpen] = useState(false);

  const activeViewName = activeViewId
    ? [...privateSavedFilterViews, ...sharedSavedFilterViews].find(v => v.id === activeViewId)?.name
    : undefined;

  const handleApplySavedFilter = (view: SavedFilterView) => {
    setOpen(false);
    requestAnimationFrame(() => {
      onApplySavedFilters(view);
    });
  };

  const dimensions: FilterDimension[] = [
    {
      key: 'operations',
      label: 'Operations',
      items: operationFilterItems,
      selectedItems: operationFilterSelections,
      onChange: setOperationSelections,
    },
    {
      key: 'clients',
      label: 'Clients',
      items: clientFilterItems,
      selectedItems: clientFilterSelections,
      onChange: setClientSelections,
      valuesLabel: 'versions',
    },
  ];

  return (
    <FilterMenu
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button
          label={activeViewName ?? 'Filter'}
          variant="default"
          rightIcon={
            activeViewName && onClearActiveView
              ? {
                  icon: X,
                  action: onClearActiveView,
                  label: 'Clear active view',
                  withSeparator: true,
                }
              : { icon: ListFilter, withSeparator: true }
          }
        />
      }
      dimensions={dimensions}
      extraSections={[
        [
          <Menu
            key="private"
            trigger={<MenuItem>My saved filters</MenuItem>}
            sections={[
              <SavedFiltersList
                key="list"
                savedFilters={privateSavedFilterViews}
                emptyMessage="No saved private views"
                onApplySavedFilters={handleApplySavedFilter}
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
                onApplySavedFilters={handleApplySavedFilter}
              />,
            ]}
          />,
        ],
        ...(onManageSavedFilters
          ? [
              <MenuItem
                key="manage"
                variant="navigationLink"
                onClick={onManageSavedFilters}
              >
                Manage saved filters
              </MenuItem>,
            ]
          : []),
      ]}
    />
  );
}
