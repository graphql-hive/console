import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { FilterDropdown } from './filter-dropdown';
import type { FilterItem, FilterSelection } from './types';

export const nav: NavPath = 'Base/Floating/FilterDropdown';

const CLIENTS: FilterItem[] = [
  { name: 'Hive CLI', values: Array.from({ length: 18 }, (_, i) => `0.12.${i}`) },
  { name: 'Hive Client', values: ['1.0.0', '1.0.1', '1.1.0'] },
  { name: 'hive-gateway', values: ['0.1.0', '0.2.0', '0.3.0', '1.0.0'] },
  { name: 'graphql-yoga', values: ['5.0.0', '5.1.0', '5.2.0', '5.3.0'] },
  { name: 'apollo-rover', values: ['0.23.0', '0.24.0', '0.25.0'] },
  { name: 'graphql-mesh', values: ['1.0.0', '1.1.0', '1.2.0'] },
  { name: 'cosmo-router', values: ['0.1.0', '0.2.0', '0.3.0'] },
  { name: 'stellate-edge', values: ['0.9.0', '0.10.0'] },
  { name: 'unknown', values: [] },
];

/** Flat dimension: items with no sub-values render without a sub-panel. */
const SEVERITIES: FilterItem[] = [
  { name: 'Breaking', values: [] },
  { name: 'Dangerous', values: [] },
  { name: 'Safe', values: [] },
];

function SelectionReadout({ selected }: { selected: FilterSelection[] }) {
  if (selected.length === 0) {
    return <div className="text-neutral-8 text-sm">No filters active</div>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {selected.map(selection => (
        <li key={selection.name} className="text-neutral-11">
          <span className="text-neutral-12 font-medium">{selection.name}</span>
          {': '}
          {selection.values === null ? (
            <span className="text-neutral-8 italic">all</span>
          ) : (
            <span className="text-neutral-9">{selection.values.join(', ')}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function FilterHarness({
  items,
  label,
  labelPlural,
  valuesLabel,
  initial = [],
  withExcludeMode = false,
}: {
  items: FilterItem[];
  label: string;
  labelPlural?: string;
  valuesLabel?: string;
  initial?: FilterSelection[];
  withExcludeMode?: boolean;
}) {
  const [selected, setSelected] = useState<FilterSelection[]>(initial);
  const [exclude, setExclude] = useState(false);

  return (
    <div className="flex w-80 flex-col gap-6">
      <FilterDropdown
        items={items}
        label={label}
        labelPlural={labelPlural}
        selectedItems={selected}
        onChange={setSelected}
        onRemove={() => setSelected([])}
        valuesLabel={valuesLabel}
        excludeMode={withExcludeMode ? exclude : undefined}
        onExcludeModeChange={withExcludeMode ? setExclude : undefined}
      />
      <div>
        <div className="text-neutral-8 mb-2 text-xs font-medium uppercase tracking-wider">
          Selection
        </div>
        <SelectionReadout selected={selected} />
      </div>
    </div>
  );
}

export const Default = createPreview(() => (
  <FilterHarness items={CLIENTS} label="Client" valuesLabel="versions" />
));

export const WithSelections = createPreview(() => (
  <FilterHarness
    items={CLIENTS}
    label="Client"
    valuesLabel="versions"
    initial={[
      { name: 'Hive CLI', values: ['0.12.1', '0.12.3'] },
      { name: 'hive-gateway', values: null },
    ]}
  />
));

/** `excludeMode` adds the is / is-not toggle to the chip. */
export const ExcludeMode = createPreview(() => (
  <FilterHarness
    items={CLIENTS}
    label="Client"
    valuesLabel="versions"
    initial={[{ name: 'Hive CLI', values: null }]}
    withExcludeMode
  />
));

export const FlatItems = createPreview(() => (
  <FilterHarness
    items={SEVERITIES}
    label="Severity"
    labelPlural="severities"
    initial={[{ name: 'Breaking', values: null }]}
  />
));
