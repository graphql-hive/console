import { useEffect, useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { FilterChips, FilterMenu } from './filter-menu';
import type { FilterDimension, FilterItem, FilterSelection, RangeValue } from './types';

export const nav: NavPath = 'Components/Filters/FilterMenu';

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

// A real federated supergraph has hundreds of types, so the list is long enough
// to need both the search box and the virtualizer.
const TYPES: FilterItem[] = [
  'Query',
  'Mutation',
  'Subscription',
  'Account',
  'AccountConnection',
  'Address',
  'Cart',
  'CartItem',
  'Category',
  'Checkout',
  'Currency',
  'Customer',
  'Discount',
  'Inventory',
  'InventoryItem',
  'Money',
  'Order',
  'OrderLineItem',
  'PageInfo',
  'Payment',
  'Product',
  'ProductVariant',
  'Review',
  'ReviewConnection',
  'Shipment',
  'ShippingRate',
  'User',
  'UserProfile',
  'Warehouse',
  'Wishlist',
].map(name => ({ name, values: [] }));

/**
 * Every kind together: a single-select dimension addressing a route param, a
 * free-text dimension, a range, a list of exact values, and a toggle. Toggles group into their own
 * section below the divider and never produce a chip.
 */
export const AllDimensionKinds = createPreview(() => {
  const [type, setType] = useState<FilterSelection[]>([{ name: 'Product', values: null }]);
  const [field, setField] = useState('price');
  const [duration, setDuration] = useState<RangeValue>({ min: 100, max: 500 });
  const [ids, setIds] = useState<string[]>([]);
  const [descriptions, setDescriptions] = useState(false);
  const [targets, setTargets] = useState<FilterSelection[]>([]);

  const dimensions: FilterDimension[] = [
    {
      key: 'type',
      label: 'Type',
      items: TYPES,
      selectedItems: type,
      onChange: setType,
      singleSelect: true,
      alwaysShowSearch: true,
    },
    {
      key: 'field',
      label: 'Field',
      kind: 'text',
      value: field,
      onChange: setField,
      placeholder: 'Find field',
    },
    {
      key: 'duration',
      label: 'Duration',
      kind: 'range',
      bounds: { min: 0, max: 100_000 },
      unit: 'ms',
      value: duration,
      onChange: setDuration,
    },
    {
      key: 'id',
      label: 'ID',
      kind: 'text-list',
      values: ids,
      onChange: setIds,
      placeholder: 'Paste or type an id',
      countNoun: 'id',
    },
    {
      key: 'target',
      label: 'Target',
      items: TARGETS,
      selectedItems: targets,
      onChange: setTargets,
    },
    {
      key: 'descriptions',
      label: 'Show descriptions',
      kind: 'toggle',
      checked: descriptions,
      onChange: setDescriptions,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu dimensions={dimensions} />
      <FilterChips dimensions={dimensions} />
    </div>
  );
});

const INSIGHTS_OPERATIONS: FilterItem[] = [
  'GetOrganizationMembersWithPermissions',
  'ListSchemaVersionsForTargetOverview',
  'CreateAccessTokenForOrganization',
  'UpdateProjectRegistryModelSettings',
  'GetSchemaCheckWithBreakingChanges',
  'FetchUsageStatisticsForClientVersion',
  'DeleteTargetConditionalBreakingChangeConfig',
  'ListOrganizationInvitationsPaginated',
  'CompareSchemaVersionsWithContracts',
  'PublishSubgraphSchemaWithMetadata',
  'GetLaboratoryPreflightScriptHistory',
  'IntrospectSupergraphFromCdn',
  'ListAlertChannelsForProject',
  'GetBillingUsageAndLimitsForOrg',
  'me',
  'ping',
].map((name, i) => ({ id: `hash-${i}`, name, values: [] }));

const INSIGHTS_CLIENTS: FilterItem[] = [
  { name: 'unknown', values: [] },
  { name: 'Hive CLI', values: ['0.50.1', '0.50.0', '0.49.0', '0.48.3'] },
  { name: 'Hive Client', values: ['0.5.0', '0.23.1', '0.14.2', '0.10.0', '0.8.2'] },
  { name: 'hive-gateway', values: ['1.13.0', '1.12.0', '1.11.4'] },
  { name: 'hive-console-frontend', values: ['0.0.1'] },
  { name: 'hive-schema-registry-worker', values: ['2.4.0', '2.3.0'] },
  { name: 'graphql-yoga', values: ['5.10.0', '5.9.0'] },
  { name: 'hive-apollo-router-plugin', values: ['1.2.0', '1.1.0', '1.0.0'] },
  { name: 'octokit-graphql', values: ['8.1.1', '8.0.0'] },
  { name: 'graphql-mesh-serve-runtime', values: ['1.5.0'] },
  { name: 'apollo-client', values: ['3.11.0', '3.10.0'] },
  { name: 'urql', values: ['4.1.0', '4.0.0'] },
  { name: 'relay-runtime', values: ['17.0.0'] },
  { name: 'hive-cdn-edge-worker', values: ['0.9.0', '0.8.0'] },
  { name: 'graphql-codegen-hive-plugin', values: ['2.0.0'] },
  { name: 'k6-load-test', values: ['0.52.0'] },
];

/**
 * The Insights page: operations and clients, both long enough to scroll and
 * search, with names longer than a short list would size the popup to.
 */
export const InsightsDimensions = createPreview(() => {
  const [operations, setOperations] = useState<FilterSelection[]>([]);
  const [clients, setClients] = useState<FilterSelection[]>([]);

  const dimensions: FilterDimension[] = [
    {
      key: 'operation',
      label: 'Operation',
      items: INSIGHTS_OPERATIONS,
      selectedItems: operations,
      onChange: setOperations,
    },
    {
      key: 'client',
      label: 'Client',
      items: INSIGHTS_CLIENTS,
      selectedItems: clients,
      onChange: setClients,
      valuesLabel: 'versions',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu dimensions={dimensions} />
      <FilterChips dimensions={dimensions} />
    </div>
  );
});

/**
 * Insights on a slow connection: the picker query resolves after the page is
 * interactive, so the submenu can be open on an empty list when the items land.
 * Open Filter → Client within the first few seconds to see it.
 */
export const InsightsDimensionsLoading = createPreview(() => {
  const [loaded, setLoaded] = useState(false);
  const [clients, setClients] = useState<FilterSelection[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setLoaded(true), 4000);
    return () => clearTimeout(timer);
  }, []);

  const dimensions: FilterDimension[] = [
    {
      key: 'client',
      label: 'Client',
      items: loaded ? INSIGHTS_CLIENTS : [],
      selectedItems: clients,
      onChange: setClients,
      valuesLabel: 'versions',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu dimensions={dimensions} />
      <FilterChips dimensions={dimensions} />
      <span className="text-xs text-fg-subtle">{loaded ? 'items loaded' : 'loading items…'}</span>
    </div>
  );
});

/** Empty text value renders no chip, and the toggle section still gets its divider. */
export const TextFilterEmpty = createPreview(() => {
  const [field, setField] = useState('');
  const [descriptions, setDescriptions] = useState(true);

  const dimensions: FilterDimension[] = [
    {
      key: 'field',
      label: 'Field',
      kind: 'text',
      value: field,
      onChange: setField,
      placeholder: 'Find field',
    },
    {
      key: 'descriptions',
      label: 'Show descriptions',
      kind: 'toggle',
      checked: descriptions,
      onChange: setDescriptions,
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <FilterMenu dimensions={dimensions} />
      <FilterChips dimensions={dimensions} />
    </div>
  );
});

function useDuration(initial: RangeValue): FilterDimension[] {
  const [value, setValue] = useState(initial);
  return [
    {
      key: 'duration',
      label: 'Duration',
      kind: 'range',
      bounds: { min: 0, max: 100_000 },
      unit: 'ms',
      value,
      onChange: setValue,
    },
  ];
}

function RangeReadout(props: { dimension: FilterDimension }) {
  const value = props.dimension.kind === 'range' ? props.dimension.value : null;
  return (
    <span className="font-mono text-xs text-fg-secondary">value: {JSON.stringify(value)}</span>
  );
}

/** A range with both bounds set, as the traces Duration filter will use it. */
export const RangeDimension = createPreview(() => {
  const dimensions = useDuration({ min: 100, max: 500 });
  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-xs text-fg-secondary">
        Open Filter, then Duration. Typing commits on Enter or blur, and the slider commits on
        release, so the value below changes once per edit rather than per keystroke or drag tick.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu dimensions={dimensions} />
        <FilterChips dimensions={dimensions} />
      </div>
      <RangeReadout dimension={dimensions[0]} />
    </div>
  );
});

/** Starts unbounded, so there is no chip until a bound is set. */
export const RangeOpenEnded = createPreview(() => {
  const dimensions = useDuration({ min: null, max: null });
  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-xs text-fg-secondary">
        Set only a minimum to get a "≥" chip, or only a maximum for "≤". Dragging a thumb back to
        its end, or clearing its input, makes that side unbounded again. With both sides unbounded
        the chip goes away.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu dimensions={dimensions} />
        <FilterChips dimensions={dimensions} />
      </div>
      <RangeReadout dimension={dimensions[0]} />
    </div>
  );
});

const TRACE_IDS = [
  '4bf92f3577b34da6a3ce929d0e0e4736',
  '00f067aa0ba902b7a3ce929d0e0e4736',
  'd4cda95b652f4a1592b449d5929fda1b',
];

/** Trace IDs as the traces page will take them: typed one at a time or pasted in bulk. */
export const TextListDimension = createPreview(() => {
  const [ids, setIds] = useState<string[]>(TRACE_IDS.slice(0, 1));
  const dimensions: FilterDimension[] = [
    {
      key: 'traceId',
      label: 'Trace ID',
      kind: 'text-list',
      values: ids,
      onChange: setIds,
      placeholder: 'Paste or type a trace ID',
      countNoun: 'id',
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-xs text-fg-secondary">
        Open Filter, then Trace ID. Enter adds what is typed. Pasting several ids separated by
        spaces, commas or new lines adds them all at once. Duplicates and blanks are skipped.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu dimensions={dimensions} />
        <FilterChips dimensions={dimensions} />
      </div>
      <code className="max-w-prose font-mono text-xs break-all text-fg-subtle">
        Copy to paste: {TRACE_IDS.join(', ')}
      </code>
    </div>
  );
});
