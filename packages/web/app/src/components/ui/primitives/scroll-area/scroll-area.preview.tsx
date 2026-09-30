import { controlsFor, createPreview, type NavPath } from 'react-foundry';
import { ScrollArea } from './scroll-area';

export const nav: NavPath = 'Base/Primitives/ScrollArea';

const OPERATIONS = [
  'MemberRoleAssignmentAuditLogByOrganizationSlug',
  'CDNAccessTokenRotationQuery',
  'SchemaContractCompositionValidationList',
  'SchemaRegistryExplorerTypeDetailsForDateRangeComparison',
  'SchemaContractCompositionValidationWithPaginationAndFilters',
  'SyncByOrganizationSlug',
  'GraphQLEndpointLatencyPercentilesForDateRangeComparison',
  'DashboardSummary',
  'DashboardGet',
  'MemberRoleAssignmentAuditLogWithPaginationAndFilters',
  'ProjectAccessTokenPermissionsManagementFetch',
  'PersistedOperationCollectionSyncFetch',
  'Compare',
];

function Rows(props: { count?: number }) {
  const rows = Array.from(
    { length: props.count ?? OPERATIONS.length },
    (_, i) => OPERATIONS[i % OPERATIONS.length],
  );
  return (
    <div className="flex flex-col">
      {rows.map((name, index) => (
        <div
          key={index}
          className="text-fg-default hover:bg-neutral-4 flex items-center rounded-md px-2 py-1 text-sm"
        >
          <span className="truncate font-medium">{name}</span>
          <span className="ml-auto pl-4 font-light">{(index * 37) % 1000}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A scroll container with an overlaid scrollbar that is only drawn while the pointer is over the
 * area or it is moving. Hover each to see it. Heights are a scale (160, 240, 360px) rather than
 * arbitrary values: the three sites that were 176, 250 and 400px snap to the nearest step.
 */
export const Heights = createPreview(() => (
  <div className="flex items-start gap-6">
    {(['sm', 'md', 'lg'] as const).map(height => (
      <div key={height} className="border-line w-72 rounded-md border p-2">
        <ScrollArea height={height}>
          <Rows count={30} />
        </ScrollArea>
      </div>
    ))}
  </div>
));

/** `maxHeight` only scrolls once the content is taller than the step; short content sits flush. */
export const MaxHeight = createPreview(() => (
  <div className="flex items-start gap-6">
    <div className="border-line w-72 rounded-md border p-2">
      <ScrollArea maxHeight="sm">
        <Rows count={3} />
      </ScrollArea>
    </div>
    <div className="border-line w-72 rounded-md border p-2">
      <ScrollArea maxHeight="sm">
        <Rows count={30} />
      </ScrollArea>
    </div>
  </div>
));

/** `fill` takes what is left of a flex column: a header, then a list that scrolls to the bottom edge. */
export const Fill = createPreview(() => (
  <div className="border-line flex h-64 w-80 flex-col rounded-md border">
    <div className="border-line text-fg border-b px-3 py-2 text-sm font-medium">
      Span attributes
    </div>
    <ScrollArea fill>
      <div className="p-2">
        <Rows count={30} />
      </div>
    </ScrollArea>
  </div>
));

const WIDE = OPERATIONS.join('  ');

export const Horizontal = createPreview(() => (
  <div className="border-line w-96 rounded-md border">
    <ScrollArea axis="horizontal">
      <pre className="text-fg-default text-2xs whitespace-pre p-2 font-mono leading-tight">
        {WIDE}
        {'\n'}
        {WIDE}
      </pre>
    </ScrollArea>
  </div>
));

export const Both = createPreview(() => (
  <div className="border-line w-96 rounded-md border">
    <ScrollArea axis="both" height="sm">
      <pre className="text-fg-default text-2xs whitespace-pre p-2 font-mono leading-tight">
        {Array.from({ length: 30 }, () => WIDE).join('\n')}
      </pre>
    </ScrollArea>
  </div>
));

/** Row count against the height steps, to find where each one starts scrolling. */
export const Playground = createPreview({
  controls: controlsFor(ScrollArea, {
    children: {
      type: 'range',
      label: 'Rows',
      min: 1,
      max: 60,
      default: 30,
      derive: count => <Rows count={count} />,
    },
    height: {
      type: 'radio',
      options: ['unset', 'sm', 'md', 'lg'],
      default: 'sm',
      derive: step => (step === 'unset' ? undefined : step),
    },
    maxHeight: {
      type: 'radio',
      options: ['unset', 'sm', 'md', 'lg', 'screen'],
      default: 'unset',
      derive: step => (step === 'unset' ? undefined : step),
    },
  }),
  render: v => (
    <div className="border-line w-72 rounded-md border p-2">
      <ScrollArea height={v.height} maxHeight={v.maxHeight}>
        {v.children}
      </ScrollArea>
    </div>
  ),
});
