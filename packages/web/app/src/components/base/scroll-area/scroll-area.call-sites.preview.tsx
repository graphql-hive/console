import { createPreview, type NavPath } from 'react-foundry';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { Badge } from '../badge/badge';
import { ScrollArea } from './scroll-area';

export const nav: NavPath = 'Base/Primitives/ScrollArea/Component Examples';

/**
 * ScrollArea has too many sites to transcribe one by one, so this holds one representative per
 * shape and the inventory lists the rest under it.
 *
 * History: `ui/scroll-area` (Radix) had three live sites in round 4. The other twenty-odd were
 * hand-rolled `overflow-y-auto` boxes, each with its own height, and moved onto the component in
 * the same round. Sheet and modal bodies wait for round 6, the table wrapper for round 5.
 */

const ENTRIES = [
  {
    source: 'pages/target-checks-single.tsx:498',
    origin: 'base',
    what: 'All Targets list in a popover, height=sm',
    coveredBy: 'Bounded list',
  },
  {
    source:
      'pages/target-insights-client.tsx:261, :306; target-insights-coordinate.tsx:506, :549, :593',
    origin: 'base',
    what: 'Operations, Versions, Clients and Errors cards, maxHeight=lg',
    coveredBy: 'Bounded list',
  },
  {
    source: 'components/target/history/errors-and-changes.tsx:512, :636',
    origin: 'base',
    what: 'Affected operations in a deployment popover, maxHeight=sm',
    coveredBy: 'Bounded list',
  },
  {
    source: 'components/target/explorer/super-graph-metadata.tsx:227',
    origin: 'base',
    what: 'All Subgraphs chips in a popover, maxHeight=md',
    coveredBy: 'Bounded list',
  },
  {
    source: 'components/organization/members/roles.tsx:236, :294, :500, :511',
    origin: 'base',
    what: 'Permission columns in the role dialogs, fill inside a 400px column',
    coveredBy: 'Fill panel',
  },
  {
    source: 'pages/target-checks.tsx:318 and pages/target-history.tsx:284',
    origin: 'base',
    what: 'Checks and versions list columns, fill inside a viewport-pinned column',
    coveredBy: 'Fill panel',
  },
  {
    source: 'pages/target-trace.tsx:108, :883, :1585',
    origin: 'base',
    what: 'Trace tree, span attributes panel and span details sheet body, fill',
    coveredBy: 'Fill panel',
  },
  {
    source: 'components/organization/members/resource-selector.tsx:816, :864, :939',
    origin: 'base',
    what: 'The three resource columns, fill and axis=both',
    coveredBy: 'Fill panel',
  },
  {
    source:
      'pages/organization-support.tsx:166, lib/preflight/graphiql-plugin.tsx:803, ui/date-range-picker.tsx:528',
    origin: 'base',
    what: 'Support ticket form body, preflight console output, quick ranges list, fill',
    coveredBy: 'Fill panel',
  },
  {
    source:
      'pages/manage.tsx:48, proposals/schema-diff/components.tsx:39, alerts/alert-notification-preview.tsx:209, pages/target-trace.tsx:1766',
    origin: 'base',
    what: 'Stats page, change document table, webhook payload, stack trace, axis=horizontal',
    coveredBy: 'Horizontal',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/scroll-area"
      summary={
        <>
          Three shapes: a list capped at a step of the height scale, a panel filling the rest of a
          flex column, and a block that scrolls sideways. The scrollbar is overlaid and shows on
          hover, so a short list looks the same as before it could scroll.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

const OPERATIONS = [
  ['9f4b_SchemaRegistryExplorerTypeDetailsFetch_811', 102, '0.15%'],
  ['56d4_ProjectAccessTokenPermissionsManagementStats_949', 99, '0.14%'],
  ['e1d9_GraphQLEndpointLatencyPercentilesStats_435', 99, '0.14%'],
  ['4cca_FeedSummary_125', 94, '0.14%'],
  ['c47e_GraphQLEndpointLatencyPercentilesWithPaginationAndFilters_215', 94, '0.14%'],
  ['c2af_MemberRoleAssignmentAuditLogWithPaginationAndFilters_738', 94, '0.14%'],
  ['0f7c_SyncForDateRangeComparison_246', 93, '0.13%'],
  ['8b5a_PersistedOperationCollectionSyncForDateRangeComparison_774', 93, '0.13%'],
  ['cca1_SettingsWithPaginationAndFilters_461', 93, '0.13%'],
  ['85f5_SyncQuery_266', 93, '0.13%'],
  ['496b_PersistedOperationCollectionSyncByOrganizationSlug_494', 93, '0.13%'],
  ['c54e_SyncCount_706', 92, '0.13%'],
  ['3949_UserNotificationPreferencesUpdateQuery_530', 91, '0.13%'],
] as const;

/** The Operations card on the insights coordinate page, in a grid column like the real one. */
export const BoundedList = createPreview({
  label: 'Bounded list',
  render: () => (
    <CallSite
      source="pages/target-insights-coordinate.tsx:506"
      origin="base"
      note="Inside a nested grid column, which is what let the old list push its card over the neighbour when a name was longer than the column. The area now contains its own width, so the names truncate."
    >
      <div className="grid w-[40rem] grid-cols-7 gap-4">
        <div className="col-span-4 grid">
          <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-4 rounded-md border">
            <div className="flex flex-col space-y-1.5 p-5">
              <h3 className="text-neutral-12 text-lg font-medium leading-none">Operations</h3>
              <p className="text-neutral-10 text-control">
                Query.hero was used by 970 operations in last 7 days
              </p>
            </div>
            <div className="p-5 pt-0">
              <ScrollArea maxHeight="lg">
                {OPERATIONS.map(([name, count, share]) => (
                  <a
                    key={name}
                    href="#"
                    className="text-neutral-11 hover:text-neutral-11 hover:bg-neutral-4 flex items-center rounded-md px-2 py-1 hover:underline hover:underline-offset-2"
                  >
                    <p className="truncate text-sm font-medium">{name}</p>
                    <div className="ml-auto flex min-w-[150px] flex-row items-center justify-end text-sm font-light">
                      <div>{count}</div>
                      <div className="min-w-[70px] text-right">{share}</div>
                    </div>
                  </a>
                ))}
              </ScrollArea>
            </div>
          </div>
        </div>
        <div className="col-span-3 grid">
          <div className="bg-neutral-2 dark:bg-neutral-3 border-neutral-4 rounded-md border p-5">
            <h3 className="text-neutral-12 text-lg font-medium leading-none">Clients</h3>
          </div>
        </div>
      </div>
    </CallSite>
  ),
});

const SPAN_ATTRIBUTES = [
  ['graphql.operation.name', 'DashboardGet'],
  ['graphql.operation.type', 'query'],
  ['graphql.document', '{ hero { name } }'],
  ['http.status_code', '200'],
  ['hive.client.name', 'web-app'],
  ['hive.client.version', '3.4.1'],
  ['server.address', 'api.internal'],
  ['url.path', '/graphql'],
];

/** The span attributes panel on the trace page: a tab strip, then the list filling the rest. */
export const FillPanel = createPreview({
  label: 'Fill panel',
  render: () => (
    <CallSite
      source="pages/target-trace.tsx:883"
      origin="base"
      note="fill takes what is left of the flex column under the tab strip. The rows drop each attribute's copy and expand buttons."
    >
      <div className="border-neutral-5 flex h-64 w-[24rem] flex-col rounded-md border">
        <div className="border-neutral-5 flex shrink-0 border-b px-2 text-sm">
          <button type="button" className="border-b-2 border-[#2662d8] p-2">
            <div className="flex items-center gap-x-2">
              <div>Attributes</div>
            </div>
          </button>
          <button
            type="button"
            className="hover:border-neutral-5 border-b-2 border-transparent p-2"
          >
            <div className="flex items-center gap-x-2">
              <div>Events</div>
              <div>
                <Badge content="3" variants={{ variant: 'secondary', size: 'sm' }} />
              </div>
            </div>
          </button>
        </div>
        <ScrollArea fill>
          <div className="h-full">
            {SPAN_ATTRIBUTES.map(([key, value]) => (
              <div
                key={key}
                className="border-neutral-5 flex items-center justify-between border-b p-3 text-xs last:border-0"
              >
                <div className="text-neutral-10 flex flex-1 pr-2">{key}</div>
                <div className="text-neutral-12 truncate">{value}</div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </CallSite>
  ),
});

const STACKTRACE = [
  'Error: Cannot return null for non-nullable field Query.hero.',
  '    at completeValue (/app/node_modules/graphql/execution/execute.js:614:13)',
  '    at executeField (/app/node_modules/graphql/execution/execute.js:481:19)',
  '    at executeFields (/app/node_modules/graphql/execution/execute.js:413:22)',
  '    at executeOperation (/app/node_modules/graphql/execution/execute.js:344:14)',
].join('\n');

/** The exception teaser on the trace page: a stack trace that scrolls sideways rather than wrapping. */
export const Horizontal = createPreview({
  label: 'Horizontal',
  render: () => (
    <CallSite
      source="pages/target-trace.tsx:1766"
      origin="base"
      note="axis=horizontal keeps the Content part, which gives a wide block the room it needs; hover to see the scrollbar along the bottom."
    >
      <div className="border-neutral-5 w-[24rem] rounded-md border p-3 text-xs">
        <p className="text-neutral-11">Cannot return null for non-nullable field Query.hero.</p>
        <div className="bg-neutral-1/50 mt-2 rounded-sm">
          <ScrollArea axis="horizontal">
            <pre className="text-neutral-10 text-2xs p-2 font-mono leading-tight">{STACKTRACE}</pre>
          </ScrollArea>
        </div>
      </div>
    </CallSite>
  ),
});
