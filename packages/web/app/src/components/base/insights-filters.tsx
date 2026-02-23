import { useState } from 'react';
import { ListFilter, X } from 'lucide-react';
import { FilterContent } from '@/components/base/filter-dropdown/filter-content';
import { FilterItem, FilterSelection } from '@/components/base/filter-dropdown/types';
import { Menu, MenuItem } from '@/components/base/menu/menu';
import { TriggerButton } from '@/components/base/trigger-button';

export type SavedFilterView = {
  id: string;
  name: string;
  viewerCanUpdate: boolean;
  filters: {
    operationHashes: string[];
    clientFilters: Array<{ name: string; versions: string[] | null }>;
    dateRange: { from: string; to: string } | null;
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
    // Defer navigation to next frame so the menu portals unmount first
    requestAnimationFrame(() => {
      onApplySavedFilters(view);
    });
  };

  return (
    <Menu
      trigger={
        <TriggerButton
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
      open={open}
      onOpenChange={setOpen}
      modal={false}
      side="bottom"
      align="start"
      sections={[
        [
          <Menu
            key="operations"
            trigger={<MenuItem>Operations</MenuItem>}
            autoWidth
            sections={[
              <FilterContent
                key="content"
                label="operations"
                items={operationFilterItems}
                selectedItems={operationFilterSelections}
                onChange={setOperationSelections}
              />,
            ]}
          />,
          <Menu
            key="clients"
            trigger={<MenuItem>Clients</MenuItem>}
            autoWidth
            sections={[
              <FilterContent
                key="content"
                label="clients"
                items={clientFilterItems}
                selectedItems={clientFilterSelections}
                onChange={setClientSelections}
                valuesLabel="versions"
              />,
            ]}
          />,
        ],
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
        <MenuItem key="manage" variant="navigationLink" onClick={onManageSavedFilters}>
          Manage saved filters
        </MenuItem>,
      ]}
    />
  );
}
