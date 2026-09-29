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
  { name: 'hive-schema-registry-worker', values: ['2.4.0', '2.3.0'] },
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
    return <div className="text-fg-subtle text-sm">No filters active</div>;
  }

  return (
    <ul className="space-y-1 text-sm">
      {selected.map(selection => (
        <li key={selection.name} className="text-fg-default">
          <span className="text-fg font-medium">{selection.name}</span>
          {': '}
          {selection.values === null ? (
            <span className="text-fg-subtle italic">all</span>
          ) : (
            <span className="text-fg-muted">{selection.values.join(', ')}</span>
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
  disabled,
  singleSelect,
  alwaysShowSearch,
}: {
  items: FilterItem[];
  label: string;
  labelPlural?: string;
  valuesLabel?: string;
  initial?: FilterSelection[];
  withExcludeMode?: boolean;
  disabled?: boolean;
  singleSelect?: boolean;
  alwaysShowSearch?: boolean;
}) {
  const [selected, setSelected] = useState<FilterSelection[]>(initial);
  const [exclude, setExclude] = useState(false);

  return (
    // items-start: the chip is inline-flex, and a stretch-aligned column would
    // pull it to the full width of the harness.
    <div className="flex w-80 flex-col items-start gap-6">
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
        disabled={disabled}
        singleSelect={singleSelect}
        alwaysShowSearch={alwaysShowSearch}
      />
      <div>
        <div className="text-fg-subtle mb-2 text-xs font-medium uppercase tracking-wider">
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

export const Playground = createPreview({
  controls: {
    items: { type: 'radio', options: ['clients', 'severities'], default: 'clients' },
    excludeMode: { type: 'boolean', default: false },
    singleSelect: { type: 'boolean', default: false },
    alwaysShowSearch: { type: 'boolean', default: false },
    disabled: { type: 'boolean', default: false },
  },
  render: v =>
    v.items === 'clients' ? (
      <FilterHarness
        key="clients"
        items={CLIENTS}
        label="Client"
        valuesLabel="versions"
        withExcludeMode={v.excludeMode}
        singleSelect={v.singleSelect}
        alwaysShowSearch={v.alwaysShowSearch}
        disabled={v.disabled}
      />
    ) : (
      <FilterHarness
        key="severities"
        items={SEVERITIES}
        label="Severity"
        labelPlural="severities"
        withExcludeMode={v.excludeMode}
        singleSelect={v.singleSelect}
        alwaysShowSearch={v.alwaysShowSearch}
        disabled={v.disabled}
      />
    ),
});
