import { ListFilter } from 'lucide-react';
import {
  MenuContent,
  MenuItem,
  MenuRoot,
  MenuSeparator,
  MenuSubmenu,
  MenuTrigger,
} from '@/components/base/menu/menu';
import { FilterContent } from '@/components/base/filter-dropdown/filter-content';
import { FilterItem, FilterSelection } from '@/components/base/filter-dropdown/types';
import { TriggerButton } from '@/components/base/trigger-button';

type InsightsFiltersProps = {
  clientFilterItems: FilterItem[];
  clientFilterSelections: FilterSelection[];
  operationFilterItems: FilterItem[];
  operationFilterSelections: FilterSelection[];
  setClientSelections: (value: FilterSelection[]) => void;
  setOperationSelections: (value: FilterSelection[]) => void;
};

export function InsightsFilters({
  clientFilterItems,
  clientFilterSelections,
  operationFilterItems,
  operationFilterSelections,
  setClientSelections,
  setOperationSelections,
}: InsightsFiltersProps) {
  return (
    <MenuRoot modal={false}>
      <MenuTrigger
        render={<TriggerButton label="Filter" icon={<ListFilter className="size-4" />} />}
      />
      <MenuContent side="bottom" align="start" sideOffset={8} withPadding>
        <MenuSubmenu>
          <MenuItem subMenuTrigger>Views</MenuItem>
          <MenuSeparator />
          <MenuContent subMenu withPadding>
            <MenuItem>My views</MenuItem>
            <MenuItem>Shared views</MenuItem>
            <MenuSeparator />
            <MenuItem variant="navigationLink">Manage views</MenuItem>
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
