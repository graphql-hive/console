import { useState } from 'react';
import { ListFilter } from 'lucide-react';
import { FilterContent } from '@/components/base/filter-dropdown/filter-content';
import { FilterItem, FilterSelection } from '@/components/base/filter-dropdown/types';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuSubmenu,
  MenuTrigger,
} from '@/components/base/menu/menu';
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
    return (
      <MenuItem inSubmenu disabled>
        {emptyMessage}
      </MenuItem>
    );
  }

  return (
    <>
      {savedFilters.map(savedFilter => (
        <MenuItem key={savedFilter.id} inSubmenu onClick={() => onApplySavedFilters(savedFilter)}>
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
}: InsightsFiltersProps) {
  const [open, setOpen] = useState(false);

  const handleApplySavedFilter = (view: SavedFilterView) => {
    setOpen(false);
    // Defer navigation to next frame so the menu portals unmount first
    requestAnimationFrame(() => {
      onApplySavedFilters(view);
    });
  };

  return (
    <MenuRoot open={open} onOpenChange={setOpen} modal={false}>
      <MenuTrigger
        render={
          <TriggerButton label="Filter" rightIcon={{ icon: ListFilter, withSeparator: true }} />
        }
      />
      <MenuContent side="bottom" align="start" sideOffset={8} withXPadding withYPadding>
        <MenuSubmenu>
          <MenuItem subMenuTrigger>Saved filters</MenuItem>
          <MenuSeparator />
          <MenuContent subMenu withXPadding withYPadding>
            <MenuSubmenu>
              <MenuItem subMenuTrigger>My saved filters</MenuItem>
              <MenuContent subMenu withYPadding>
                <SavedFiltersList
                  savedFilters={privateSavedFilterViews}
                  emptyMessage="No saved private views"
                  onApplySavedFilters={handleApplySavedFilter}
                />
              </MenuContent>
            </MenuSubmenu>
            <MenuSubmenu>
              <MenuItem subMenuTrigger>Shared saved filters</MenuItem>
              <MenuContent subMenu withYPadding>
                <SavedFiltersList
                  savedFilters={sharedSavedFilterViews}
                  emptyMessage="No saved shared views"
                  onApplySavedFilters={handleApplySavedFilter}
                />
              </MenuContent>
            </MenuSubmenu>
            <MenuSeparator />
            <MenuItem variant="navigationLink" onClick={onManageSavedFilters}>
              Manage saved filters
            </MenuItem>
          </MenuContent>
        </MenuSubmenu>
        <MenuSubmenu>
          <MenuItem subMenuTrigger>Operations</MenuItem>
          <MenuContent subMenu>
            <FilterContent
              label="operations"
              items={operationFilterItems}
              selectedItems={operationFilterSelections}
              onChange={setOperationSelections}
            />
          </MenuContent>
        </MenuSubmenu>
        <MenuSubmenu>
          <MenuItem subMenuTrigger>Clients</MenuItem>
          <MenuContent subMenu>
            <FilterContent
              label="clients"
              items={clientFilterItems}
              selectedItems={clientFilterSelections}
              onChange={setClientSelections}
              valuesLabel="versions"
            />
          </MenuContent>
        </MenuSubmenu>
      </MenuContent>
    </MenuRoot>
  );
}
