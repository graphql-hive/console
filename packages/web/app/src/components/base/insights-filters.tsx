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

export type SavedView = {
  id: string;
  name: string;
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
  privateViews: SavedView[];
  sharedViews: SavedView[];
  setClientSelections: (value: FilterSelection[]) => void;
  setOperationSelections: (value: FilterSelection[]) => void;
  onApplyView: (view: SavedView) => void;
  onManageViews?: () => void;
};

function ViewsList({
  views,
  emptyMessage,
  onApplyView,
}: {
  views: SavedView[];
  emptyMessage: string;
  onApplyView: (view: SavedView) => void;
}) {
  if (views.length === 0) {
    return (
      <MenuItem inSubmenu disabled>
        {emptyMessage}
      </MenuItem>
    );
  }

  return (
    <>
      {views.map(view => (
        <MenuItem key={view.id} inSubmenu onClick={() => onApplyView(view)}>
          {view.name}
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
  privateViews,
  sharedViews,
  setClientSelections,
  setOperationSelections,
  onApplyView,
  onManageViews,
}: InsightsFiltersProps) {
  const [open, setOpen] = useState(false);

  const handleApplyView = (view: SavedView) => {
    setOpen(false);
    // Defer navigation to next frame so the menu portals unmount first
    requestAnimationFrame(() => {
      onApplyView(view);
    });
  };

  return (
    <MenuRoot open={open} onOpenChange={setOpen} modal={false}>
      <MenuTrigger
        render={<TriggerButton label="Filter" icon={<ListFilter className="size-4" />} />}
      />
      <MenuContent side="bottom" align="start" sideOffset={8} withXPadding withYPadding>
        <MenuSubmenu>
          <MenuItem subMenuTrigger>Views</MenuItem>
          <MenuSeparator />
          <MenuContent subMenu withXPadding withYPadding>
            <MenuSubmenu>
              <MenuItem subMenuTrigger>My views</MenuItem>
              <MenuContent subMenu withYPadding>
                <ViewsList
                  views={privateViews}
                  emptyMessage="No saved private views"
                  onApplyView={handleApplyView}
                />
              </MenuContent>
            </MenuSubmenu>
            <MenuSubmenu>
              <MenuItem subMenuTrigger>Shared views</MenuItem>
              <MenuContent subMenu withYPadding>
                <ViewsList
                  views={sharedViews}
                  emptyMessage="No saved shared views"
                  onApplyView={handleApplyView}
                />
              </MenuContent>
            </MenuSubmenu>
            <MenuSeparator />
            <MenuItem variant="navigationLink" onClick={onManageViews}>
              Manage views
            </MenuItem>
          </MenuContent>
        </MenuSubmenu>
        <MenuSubmenu>
          <MenuItem subMenuTrigger>Operations</MenuItem>
          <MenuContent subMenu>
            <FilterContent
              label="operations"
              items={operationFilterItems}
              value={operationFilterSelections}
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
              value={clientFilterSelections}
              onChange={setClientSelections}
              valuesLabel="versions"
            />
          </MenuContent>
        </MenuSubmenu>
      </MenuContent>
    </MenuRoot>
  );
}
