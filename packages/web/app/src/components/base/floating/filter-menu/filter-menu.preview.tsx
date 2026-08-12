import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { FilterChips, FilterMenu } from './filter-menu';
import type { FilterDimension, FilterItem, FilterSelection } from './types';

export const nav: NavPath = 'Base/Floating/FilterMenu';

const CLIENTS: FilterItem[] = [
  { name: 'Hive CLI', values: ['0.12.0', '0.12.1', '0.12.2', '0.12.3'] },
  { name: 'hive-gateway', values: ['0.1.0', '0.2.0', '1.0.0'] },
  { name: 'graphql-yoga', values: ['5.0.0', '5.1.0'] },
];

const TARGETS: FilterItem[] = [
  { name: 'production', values: [] },
  { name: 'staging', values: [] },
  { name: 'development', values: [] },
];

const SEVERITIES: FilterItem[] = [
  { name: 'Breaking', values: [] },
  { name: 'Dangerous', values: [] },
  { name: 'Safe', values: [] },
];

/**
 * Holds one selection array per dimension, which is what the real call sites do
 * (they keep it in URL state instead).
 */
function useDimensions(initial: Record<string, FilterSelection[]> = {}) {
  const [clients, setClients] = useState<FilterSelection[]>(initial.clients ?? []);
  const [targets, setTargets] = useState<FilterSelection[]>(initial.targets ?? []);
  const [severities, setSeverities] = useState<FilterSelection[]>(initial.severities ?? []);

  const dimensions: FilterDimension[] = [
    {
      key: 'client',
      label: 'Client',
      items: CLIENTS,
      selectedItems: clients,
      onChange: setClients,
      valuesLabel: 'versions',
    },
    {
      key: 'target',
      label: 'Target',
      items: TARGETS,
      selectedItems: targets,
      onChange: setTargets,
    },
    {
      key: 'severity',
      label: 'Severity',
      labelPlural: 'severities',
      items: SEVERITIES,
      selectedItems: severities,
      onChange: setSeverities,
    },
  ];

  return dimensions;
}

export const Default = createPreview(() => {
  const dimensions = useDimensions();
  return <FilterMenu dimensions={dimensions} />;
});

/** The usual pairing: the menu adds filters, chips edit and remove them. */
export const WithChips = createPreview(() => {
  const dimensions = useDimensions({
    clients: [{ name: 'Hive CLI', values: ['0.12.1'] }],
    targets: [{ name: 'production', values: null }],
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu dimensions={dimensions} />
      <FilterChips dimensions={dimensions} />
    </div>
  );
});

/** `activeLabel` and `onClearActive` are a matched pair: the trigger only morphs with both. */
export const ActiveView = createPreview(() => {
  const dimensions = useDimensions({
    clients: [{ name: 'hive-gateway', values: null }],
  });

  return (
    <FilterMenu dimensions={dimensions} activeLabel="Gateway errors" onClearActive={() => {}} />
  );
});
