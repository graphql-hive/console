import { useEffect, useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { RefreshButton } from '@/components/ui/refresh-button/refresh-button';
import { FilterChips, FilterMenu } from './filter-menu';
import { Filters } from './filters';
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

const flat = (names: string[]): FilterItem[] => names.map(name => ({ name, values: [] }));

const HTTP_URLS = flat(
  Array.from({ length: 1000 }, (_, i) => `https://api.acme.dev/graphql?shard=${i + 1}`),
);
const RETIRED_URL = 'https://legacy.acme.dev/graphql';

/**
 * The server sends at most 1,000 values per dimension, most frequent first. `truncatedTo` says so,
 * and a selection outside those values is kept, struck through.
 */
export const TruncatedItems = createPreview(() => {
  const [urls, setUrls] = useState<FilterSelection[]>([{ name: RETIRED_URL, values: null }]);
  const dimensions: FilterDimension[] = [
    {
      key: 'httpUrl',
      label: 'HTTP URL',
      items: [...HTTP_URLS, { name: RETIRED_URL, values: [], unavailable: true }],
      selectedItems: urls,
      onChange: setUrls,
      truncatedTo: 1000,
    },
  ];
  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-prose text-xs text-fg-secondary">
        Open Filter, then HTTP URL, or the chip. The list notes that it holds only the 1,000 most
        frequent URLs. The selected legacy URL is not among them, so it stays selected but struck
        through, and the note says why.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <FilterMenu dimensions={dimensions} />
        <FilterChips dimensions={dimensions} />
      </div>
    </div>
  );
});

const TRACES_ITEMS = {
  status: flat(['Ok', 'Error']),
  operationType: flat(['Query', 'Mutation', 'Subscription', 'Unknown']),
  operationName: flat([
    'GetProduct',
    'ListProducts',
    'RequestInfo',
    'AddToCart',
    'Checkout',
    'GetViewer',
    'SearchProducts',
    'OnOrderUpdated',
  ]),
  client: flat(['storefront-web', 'storefront-ios', 'storefront-android', 'admin-console']),
  subgraph: flat(['products', 'inventory', 'reviews', 'accounts', 'orders', 'payments']),
  errorCode: flat([
    'GRAPHQL_VALIDATION_FAILED',
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'INTERNAL_SERVER_ERROR',
    'DOWNSTREAM_SERVICE_ERROR',
  ]),
  httpStatus: flat(['200', '400', '401', '403', '500', '502', '503']),
  httpMethod: flat(['POST', 'GET']),
  httpHost: flat(['api.acme.dev', 'api.eu.acme.dev']),
  httpRoute: flat(['/graphql', '/graphql/stream']),
};

const pick = (...names: string[]): FilterSelection[] => names.map(name => ({ name, values: null }));

/**
 * The traces menu as planned, in order. Each items dimension holds its own selection; `all` starts
 * every dimension set, to show the chip row at its fullest.
 */
function useTracesDimensions(all: boolean): FilterDimension[] {
  const [status, setStatus] = useState(all ? pick('Error') : []);
  const [duration, setDuration] = useState<RangeValue>({ min: 100, max: null });
  const [operationType, setOperationType] = useState(all ? pick('Query', 'Mutation') : []);
  const [operationName, setOperationName] = useState(all ? pick('RequestInfo') : []);
  const [client, setClient] = useState(all ? pick('storefront-web') : []);
  const [subgraph, setSubgraph] = useState(all ? pick('products', 'inventory') : []);
  const [errorCode, setErrorCode] = useState(all ? pick('UNAUTHENTICATED') : []);
  const [httpStatus, setHttpStatus] = useState(all ? pick('401', '403') : []);
  const [httpMethod, setHttpMethod] = useState(all ? pick('POST') : []);
  const [httpHost, setHttpHost] = useState(all ? pick('api.acme.dev') : []);
  const [httpRoute, setHttpRoute] = useState(all ? pick('/graphql') : []);
  const [httpUrl, setHttpUrl] = useState(all ? pick(HTTP_URLS[0].name) : []);
  const [traceIds, setTraceIds] = useState(TRACE_IDS.slice(0, 2));

  return [
    {
      key: 'status',
      label: 'Status',
      items: TRACES_ITEMS.status,
      selectedItems: status,
      onChange: setStatus,
      singleSelect: true,
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
      key: 'operationType',
      label: 'Operation type',
      items: TRACES_ITEMS.operationType,
      selectedItems: operationType,
      onChange: setOperationType,
    },
    {
      key: 'operationName',
      label: 'Operation name',
      items: TRACES_ITEMS.operationName,
      selectedItems: operationName,
      onChange: setOperationName,
    },
    {
      key: 'client',
      label: 'Client',
      items: TRACES_ITEMS.client,
      selectedItems: client,
      onChange: setClient,
    },
    {
      key: 'subgraph',
      label: 'Subgraph',
      items: TRACES_ITEMS.subgraph,
      selectedItems: subgraph,
      onChange: setSubgraph,
    },
    {
      key: 'errorCode',
      label: 'Error code',
      items: TRACES_ITEMS.errorCode,
      selectedItems: errorCode,
      onChange: setErrorCode,
    },
    {
      key: 'httpStatus',
      label: 'HTTP status',
      labelPlural: 'HTTP statuses',
      items: TRACES_ITEMS.httpStatus,
      selectedItems: httpStatus,
      onChange: setHttpStatus,
    },
    {
      key: 'httpMethod',
      label: 'HTTP method',
      items: TRACES_ITEMS.httpMethod,
      selectedItems: httpMethod,
      onChange: setHttpMethod,
    },
    {
      key: 'httpHost',
      label: 'HTTP host',
      items: TRACES_ITEMS.httpHost,
      selectedItems: httpHost,
      onChange: setHttpHost,
    },
    {
      key: 'httpRoute',
      label: 'HTTP route',
      items: TRACES_ITEMS.httpRoute,
      selectedItems: httpRoute,
      onChange: setHttpRoute,
    },
    {
      key: 'httpUrl',
      label: 'HTTP URL',
      items: HTTP_URLS,
      selectedItems: httpUrl,
      onChange: setHttpUrl,
      truncatedTo: 1000,
    },
    {
      key: 'traceId',
      label: 'Trace ID',
      kind: 'text-list',
      values: traceIds,
      onChange: setTraceIds,
      placeholder: 'Paste or type a trace ID',
      countNoun: 'id',
    },
  ];
}

/** The traces filter row: the menu with the date range pinned beside it, Refresh at the far end. */
function TracesRow(props: { dimensions: FilterDimension[] }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <Filters
        dimensions={props.dimensions}
        pinnedControls={
          <DateRangePicker size="compact" selectedRange={presetLast7Days.range} align="start" />
        }
      />
      <RefreshButton onClick={() => {}} size="compact" />
    </div>
  );
}

/**
 * The traces page's planned menu: thirteen dimensions, with Duration and Trace ID set and the
 * HTTP URL list truncated. This is the reference the traces page is built to match.
 */
export const TracesDimensions = createPreview(() => {
  const dimensions = useTracesDimensions(false);
  return (
    <div className="flex w-[60rem] flex-col gap-3">
      <p className="max-w-prose text-xs text-fg-secondary">
        The planned traces menu, in order. Status picks one value. Duration and Trace ID start set,
        so their chips show. HTTP URL holds only the 1,000 most frequent values and says so.
        Operation name includes RequestInfo, which the old top-five list could leave out.
      </p>
      <TracesRow dimensions={dimensions} />
    </div>
  );
});

/** Every traces dimension set at once in a narrow row, so the chips wrap onto further lines. */
export const ManyChips = createPreview(() => {
  const dimensions = useTracesDimensions(true);
  return (
    <div className="flex w-[40rem] flex-col gap-3">
      <p className="max-w-prose text-xs text-fg-secondary">
        All thirteen traces chips at once. The row wraps rather than overflowing, and Refresh stays
        at the top right.
      </p>
      <TracesRow dimensions={dimensions} />
    </div>
  );
});
