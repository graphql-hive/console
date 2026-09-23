import { ReactElement } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { BoxIcon, CheckIcon } from 'lucide-react';
import reactStringReplace from 'react-string-replace';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Popover } from '@/components/base/floating/popover/popover';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { Label, Label as LegacyLabel } from '@/components/common';
import { CompositionErrorsPopover } from '@/components/target/history/composition-errors-popover';
import {
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { PulseIcon } from '@/components/ui/icon';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { SeverityLevelType } from '@/gql/graphql';
import { CheckCircledIcon } from '@radix-ui/react-icons';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

export function labelize(message: string) {
  // Replace '...' and "..." with <Label>...</Label>
  return reactStringReplace(message.replace(/"/g, "'"), /'((?:[^'\\]|\\.)+?)'/g, (match, i) => (
    <Label key={i}>{match.replace(/\\'/g, "'")}</Label>
  ));
}

const severityLevelMapping = {
  [SeverityLevelType.Safe]: clsx('text-emerald-400'),
  [SeverityLevelType.Dangerous]: clsx('text-yellow-400'),
} as Record<SeverityLevelType, string>;

const ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment = graphql(`
  fragment ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment on SchemaCheckConditionalBreakingChangeMetadata {
    settings {
      retentionInDays
      targets {
        id
        slug
        target {
          id
          slug
        }
      }
    }
  }
`);

const ChangesBlock_SchemaChangeApprovalFragment = graphql(`
  fragment ChangesBlock_SchemaChangeApprovalFragment on SchemaChangeApproval {
    approvedBy {
      id
      displayName
    }
    cliApprovalMetadata {
      displayName
      email
    }
    approvedAt
    schemaCheckId
  }
`);

const ChangesBlock_SchemaChangeWithUsageFragment = graphql(`
  fragment ChangesBlock_SchemaChangeWithUsageFragment on SchemaChange {
    path
    message(withSafeBasedOnUsageNote: false)
    severityLevel
    severityReason
    approval {
      ...ChangesBlock_SchemaChangeApprovalFragment
    }
    isSafeBasedOnUsage
    usageStatistics {
      topAffectedOperations {
        hash
        name
        countFormatted
        percentageFormatted
      }
      topAffectedClients {
        name
        countFormatted
        percentageFormatted
      }
    }
    affectedAppDeployments(first: 5) {
      edges {
        cursor
        node {
          id
          name
          version
          activatedAt
          lastUsed
          affectedOperations(first: 5) {
            edges {
              cursor
              node {
                hash
                name
              }
            }
          }
          totalAffectedOperations
        }
      }
      totalCount
    }
  }
`);

export const ChangesBlock_SchemaChangeFragment = graphql(`
  fragment ChangesBlock_SchemaChangeFragment on SchemaChange {
    path
    message(withSafeBasedOnUsageNote: false)
    severityLevel
    severityReason
    approval {
      ...ChangesBlock_SchemaChangeApprovalFragment
    }
    isSafeBasedOnUsage
  }
`);

type ChangeWithUsage = DocumentType<typeof ChangesBlock_SchemaChangeWithUsageFragment>;
type UsageStatistics = NonNullable<ChangeWithUsage['usageStatistics']>;
type AffectedOperation = UsageStatistics['topAffectedOperations'][number];
type AffectedClient = UsageStatistics['topAffectedClients'][number];
type AffectedDeploymentConnection = NonNullable<ChangeWithUsage['affectedAppDeployments']>;
type AffectedDeployment = AffectedDeploymentConnection['edges'][number]['node'];
type InsightsTarget = DocumentType<
  typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
>['settings']['targets'][number];

export function ChangesBlock(
  props: {
    title?: string | React.ReactElement;
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaCheckId: string;
    conditionBreakingChangeMetadata?: FragmentType<
      typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
    > | null;
  } & (
    | {
        changesWithUsage: FragmentType<typeof ChangesBlock_SchemaChangeWithUsageFragment>[];
        changes?: undefined;
      }
    | {
        changes: FragmentType<typeof ChangesBlock_SchemaChangeFragment>[];
        changesWithUsage?: undefined;
      }
  ),
): ReactElement | null {
  return (
    <div>
      {props.title && <h2 className="text-neutral-10 mb-3 font-bold">{props.title}</h2>}
      <div className="list-inside list-disc space-y-2 text-sm/relaxed">
        {props.changesWithUsage?.map((change, key) => (
          <ChangeItem
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            targetSlug={props.targetSlug}
            schemaCheckId={props.schemaCheckId}
            key={key}
            change={null}
            changeWithUsage={change}
            conditionBreakingChangeMetadata={props.conditionBreakingChangeMetadata ?? null}
          />
        ))}
        {props.changes?.map((change, key) => (
          <ChangeItem
            organizationSlug={props.organizationSlug}
            projectSlug={props.projectSlug}
            targetSlug={props.targetSlug}
            schemaCheckId={props.schemaCheckId}
            key={key}
            change={change}
            changeWithUsage={null}
            conditionBreakingChangeMetadata={props.conditionBreakingChangeMetadata ?? null}
          />
        ))}
      </div>
    </div>
  );
}

function ChangeItem(
  props: {
    conditionBreakingChangeMetadata: FragmentType<
      typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
    > | null;
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaCheckId: string;
  } & (
    | {
        change: FragmentType<typeof ChangesBlock_SchemaChangeFragment>;
        changeWithUsage: null;
      }
    | {
        change: null;
        changeWithUsage: FragmentType<typeof ChangesBlock_SchemaChangeWithUsageFragment>;
      }
  ),
) {
  const cchange = useFragment(ChangesBlock_SchemaChangeFragment, props.change);
  const cchangeWithUsage = useFragment(
    ChangesBlock_SchemaChangeWithUsageFragment,
    props.changeWithUsage,
  );

  // at least one prop must be provided :)
  const change = (cchange ?? cchangeWithUsage)!;

  const metadata = useFragment(
    ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment,
    props.conditionBreakingChangeMetadata,
  );

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionHeader className="flex">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div
              className={clsx(
                'text-left',
                (change.approval && 'text-accent') ||
                  (severityLevelMapping[change.severityLevel] ?? 'text-critical'),
              )}
            >
              <div>
                <span className="text-neutral-10">{labelize(change.message)}</span>
                {change.isSafeBasedOnUsage && (
                  <span className="cursor-pointer text-yellow-700 dark:text-yellow-500">
                    {' '}
                    <CheckIcon className="inline size-3" /> Safe based on usage data
                  </span>
                )}
                {'usageStatistics' in change && change.usageStatistics && (
                  <>
                    {' '}
                    <span className="bg-neutral-5 text-critical inline-flex items-center space-x-1 rounded-sm px-2 py-1 align-middle font-bold">
                      <PulseIcon className="h-4 stroke-[1px]" />
                      <span className="text-xs">
                        {change.usageStatistics.topAffectedOperations.length}
                        {change.usageStatistics.topAffectedOperations.length > 10 ? '+' : ''}{' '}
                        {change.usageStatistics.topAffectedOperations.length === 1
                          ? 'operation'
                          : 'operations'}{' '}
                        by {change.usageStatistics.topAffectedClients.length}{' '}
                        {change.usageStatistics.topAffectedClients.length === 1
                          ? 'client'
                          : 'clients'}{' '}
                        affected
                      </span>
                    </span>
                  </>
                )}
                {'affectedAppDeployments' in change && change.affectedAppDeployments?.totalCount ? (
                  <>
                    {' '}
                    <span className="text-neutral-1 inline-flex items-center space-x-1 rounded-sm bg-orange-500 px-2 py-1 align-middle font-bold">
                      <BoxIcon className="size-4 stroke-[2px]" />
                      <span className="text-xs">
                        {change.affectedAppDeployments.totalCount}{' '}
                        {change.affectedAppDeployments.totalCount === 1
                          ? 'app deployment'
                          : 'app deployments'}{' '}
                        affected
                      </span>
                    </span>
                  </>
                ) : null}
                {change.approval && (
                  <>
                    {' '}
                    <ApprovedByBadge approval={change.approval} />
                  </>
                )}
              </div>
            </div>
          </AccordionTrigger>
        </AccordionHeader>
        <AccordionContent className="pb-8 pt-4">
          {change.approval && (
            <SchemaChangeApproval
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
              schemaCheckId={props.schemaCheckId}
              approval={change.approval}
            />
          )}
          {'usageStatistics' in change && change.usageStatistics && metadata ? (
            <div>
              <h4 className="text-neutral-12 mb-1 text-sm font-medium">
                Affected Operations (based on usage)
              </h4>
              <div className="text-neutral-10 mb-2 flex justify-between text-sm">
                <span>
                  Top 10 operations and clients affected by this change based on usage data.
                </span>
                {metadata && (
                  <span className="text-neutral-11 text-xs">
                    See{' '}
                    {metadata.settings.targets.map((target, index, arr) => (
                      <>
                        {!target.target ? (
                          <Tooltip
                            key={index}
                            trigger={target.slug}
                            content="Target does no longer exist."
                          />
                        ) : (
                          <Link
                            key={index}
                            className="text-accent_80 hover:text-accent"
                            to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
                            params={{
                              organizationSlug: props.organizationSlug,
                              projectSlug: props.projectSlug,
                              targetSlug: target.target.slug,
                              coordinate: change.path!.join('.'),
                            }}
                            target="_blank"
                          >
                            {target.slug}
                          </Link>
                        )}
                        {index === arr.length - 1
                          ? null
                          : index === arr.length - 2
                            ? ' and '
                            : ', '}
                      </>
                    ))}{' '}
                    target insights for live usage data.
                  </span>
                )}
              </div>
              <UsageStatisticsPanels
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                usageStatistics={change.usageStatistics}
                targets={metadata.settings.targets}
              />
              {'affectedAppDeployments' in change &&
              change.affectedAppDeployments?.edges?.length ? (
                <div className="mt-6">
                  <AffectedAppDeploymentsPanel
                    organizationSlug={props.organizationSlug}
                    projectSlug={props.projectSlug}
                    targetSlug={props.targetSlug}
                    schemaCheckId={props.schemaCheckId}
                    coordinate={change.path?.join('.')}
                    connection={change.affectedAppDeployments}
                  />
                </div>
              ) : null}
            </div>
          ) : 'affectedAppDeployments' in change && change.affectedAppDeployments?.edges?.length ? (
            <AffectedAppDeploymentsPanel
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
              schemaCheckId={props.schemaCheckId}
              coordinate={change.path?.join('.')}
              connection={change.affectedAppDeployments}
            />
          ) : (
            <>
              {change.severityReason ??
                `No details available for this ${
                  change.severityLevel === SeverityLevelType.Breaking ? 'breaking ' : ''
                }change.`}
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function trafficColumns<
  TRow extends { countFormatted: string; percentageFormatted: string },
>(): ColumnDef<TRow, unknown>[] {
  return [
    {
      id: 'count',
      header: 'Total Requests',
      meta: { align: 'right', width: 'sm' },
      cell: ({ row }) => <DataTableCell kind="number" value={row.original.countFormatted} />,
    },
    {
      id: 'share',
      header: '% of traffic',
      meta: { align: 'right', width: 'sm' },
      cell: ({ row }) => <DataTableCell kind="number" value={row.original.percentageFormatted} />,
    },
  ];
}

function UsageStatisticsPanels(props: {
  organizationSlug: string;
  projectSlug: string;
  usageStatistics: UsageStatistics;
  targets: InsightsTarget[];
}) {
  const operationColumns: ColumnDef<AffectedOperation, unknown>[] = [
    {
      id: 'name',
      header: 'Operation Name',
      meta: { width: 'fill' },
      cell: ({ row }) => {
        const operationName = `${row.original.hash.substring(0, 4)}_${row.original.name}`;
        const targets = props.targets.flatMap(target =>
          target.target
            ? [
                {
                  label: target.slug,
                  link: {
                    to: '/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash' as const,
                    params: {
                      organizationSlug: props.organizationSlug,
                      projectSlug: props.projectSlug,
                      targetSlug: target.target.slug,
                      operationName,
                      operationHash: row.original.hash,
                    },
                  },
                },
              ]
            : [],
        );
        return targets.length ? (
          <DataTableCell
            kind="link-out"
            label={operationName}
            mono
            targets={targets}
            tooltip="View live usage in Insights"
          />
        ) : (
          <DataTableCell kind="text" value={operationName} mono />
        );
      },
    },
    ...trafficColumns<AffectedOperation>(),
  ];
  const clientColumns: ColumnDef<AffectedClient, unknown>[] = [
    {
      id: 'name',
      header: 'Client Name',
      meta: { width: 'fill' },
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.name} weight="medium" />,
    },
    ...trafficColumns<AffectedClient>(),
  ];

  return (
    <div className="flex gap-4">
      <div className="min-w-0 flex-1">
        <DataTable
          data={props.usageStatistics.topAffectedOperations}
          columns={operationColumns}
          getRowId={operation => operation.hash}
          pagination={{ kind: 'none' }}
          variants={{ bordered: false }}
          emptyMessage="No affected operations."
        />
      </div>
      <div className="min-w-0 flex-1">
        <DataTable
          data={props.usageStatistics.topAffectedClients}
          columns={clientColumns}
          getRowId={client => client.name}
          pagination={{ kind: 'none' }}
          variants={{ bordered: false }}
          emptyMessage="No affected clients."
        />
      </div>
    </div>
  );
}

function AffectedAppDeploymentsPanel(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  schemaCheckId: string;
  coordinate: string | undefined;
  connection: AffectedDeploymentConnection;
}) {
  const appVersionLink = (deployment: AffectedDeployment) => ({
    to: '/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion' as const,
    params: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      appName: deployment.name,
      appVersion: deployment.version,
    },
    search: { coordinates: props.coordinate },
  });

  const columns: ColumnDef<AffectedDeployment, unknown>[] = [
    {
      id: 'name',
      header: 'App Name',
      meta: { width: 'md' },
      cell: ({ row }) => (
        <DataTableCell kind="link" label={row.original.name} link={appVersionLink(row.original)} />
      ),
    },
    {
      id: 'version',
      header: 'Version',
      meta: { width: 'fill' },
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.version} />,
    },
    {
      id: 'activatedAt',
      header: 'Activated',
      cell: ({ row }) =>
        row.original.activatedAt ? (
          <DataTableCell kind="time" date={row.original.activatedAt} mode="relative-info" />
        ) : (
          <DataTableCell kind="placeholder" />
        ),
    },
    {
      id: 'lastUsed',
      header: 'Last Used',
      meta: { align: 'right' },
      cell: ({ row }) =>
        row.original.lastUsed ? (
          <DataTableCell kind="time" date={row.original.lastUsed} mode="relative-info" />
        ) : (
          <DataTableCell kind="placeholder" />
        ),
    },
    {
      id: 'operations',
      header: 'Affected Operations',
      meta: { align: 'right' },
      cell: ({ row }) => {
        const deployment = row.original;
        return (
          <DataTableCell
            kind="text"
            value={
              <Popover
                trigger={
                  <Button variant="link" className="h-auto p-0">
                    {deployment.totalAffectedOperations}{' '}
                    {deployment.totalAffectedOperations === 1 ? 'operation' : 'operations'}
                  </Button>
                }
                side="left"
                width="md"
                arrow
                content={
                  <div className="space-y-2">
                    <h5 className="text-neutral-12 font-medium">Affected Operations</h5>
                    <ScrollArea maxHeight="sm">
                      <ul className="space-y-1 text-sm">
                        {deployment.affectedOperations.edges.map(({ node: op }) => (
                          <li key={op.hash} className="text-neutral-11">
                            {op.name || `[anonymous] (${op.hash.substring(0, 8)}...)`}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                    <Link
                      {...appVersionLink(deployment)}
                      className="text-accent block pt-2 text-sm hover:underline"
                    >
                      Show all ({deployment.totalAffectedOperations}) affected operations
                    </Link>
                  </div>
                }
              />
            }
          />
        );
      },
    },
  ];

  return (
    <div>
      <h4 className="text-neutral-12 mb-1 text-sm font-medium">Affected App Deployments</h4>
      <p className="text-neutral-10 mb-2 text-sm">
        Top 5 active app deployments that have operations using this schema coordinate (snapshot
        from when the check was run).
      </p>
      <DataTable
        data={props.connection.edges.map(edge => edge.node)}
        columns={columns}
        getRowId={deployment => deployment.id}
        pagination={{ kind: 'none' }}
      />
      {props.connection.totalCount > 5 && (
        <Link
          to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId/affected-deployments"
          params={{
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
            schemaCheckId: props.schemaCheckId,
          }}
          search={{ coordinate: props.coordinate }}
          className="mt-2 block text-sm text-orange-500 hover:underline"
        >
          View all ({props.connection.totalCount}) affected app deployments
        </Link>
      )}
    </div>
  );
}

function ApprovedByBadge(props: {
  approval: FragmentType<typeof ChangesBlock_SchemaChangeApprovalFragment>;
}) {
  const approval = useFragment(ChangesBlock_SchemaChangeApprovalFragment, props.approval);
  const approvalName =
    approval.approvedBy?.displayName ?? approval.cliApprovalMetadata?.displayName ?? '<unknown>';

  return (
    <span className="cursor-pointer text-green-500">
      <CheckIcon className="inline size-3" /> Approved by {approvalName}
    </span>
  );
}

function SchemaChangeApproval(props: {
  approval: FragmentType<typeof ChangesBlock_SchemaChangeApprovalFragment>;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  schemaCheckId: string;
}) {
  const approval = useFragment(ChangesBlock_SchemaChangeApprovalFragment, props.approval);
  const approvalName =
    approval.approvedBy?.displayName ?? approval.cliApprovalMetadata?.displayName ?? '<unknown>';
  const approvalDate = format(new Date(approval.approvedAt), 'do MMMM yyyy');
  const schemaCheckPath =
    '/' +
    [
      props.organizationSlug,
      props.projectSlug,
      props.targetSlug,
      'checks',
      approval.schemaCheckId,
    ].join('/');

  return (
    <div className="mb-3">
      This breaking change was manually{' '}
      {approval.schemaCheckId === props.schemaCheckId ? (
        <>
          {' '}
          approved by {approvalName} in this schema check on {approvalDate}.
        </>
      ) : (
        <a href={schemaCheckPath} className="text-accent hover:underline">
          approved by {approvalName} on {approvalDate}.
        </a>
      )}
    </div>
  );
}

export const CompositionErrorsSection_SchemaErrorConnection = graphql(`
  fragment CompositionErrorsSection_SchemaErrorConnection on SchemaErrorConnection {
    edges {
      node {
        message
      }
    }
  }
`);

export function CompositionErrorsSection(props: {
  compositionErrors: FragmentType<typeof CompositionErrorsSection_SchemaErrorConnection>;
}) {
  const compositionErrors = useFragment(
    CompositionErrorsSection_SchemaErrorConnection,
    props.compositionErrors,
  );

  return (
    <CompositionErrorsList
      errors={compositionErrors?.edges?.map(edge => edge.node) ?? []}
      title="Composition Errors"
    />
  );
}

export function CompositionErrorsList(props: {
  errors: ReadonlyArray<{ message: string }>;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-2 px-2">
      <Heading className="my-2">
        {props.title}
        <CompositionErrorsPopover />
      </Heading>
      {props.description ? (
        <p className="text-neutral-11 mb-2 text-sm">{props.description}</p>
      ) : null}
      <ul>
        {props.errors.map((error, index) => (
          <li key={index} className="mb-1 ml-[1.25em] list-[square] pl-0 marker:pl-1">
            <CompositionError message={error.message} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompositionError(props: { message: string }) {
  return reactStringReplace(
    reactStringReplace(
      reactStringReplace(props.message, /"([^"]+)"/g, (match, index) => {
        return <LegacyLabel key={match + index}>{match}</LegacyLabel>;
      }),
      /(@[^. ]+)/g,
      (match, index) => {
        return <LegacyLabel key={match + index}>{match}</LegacyLabel>;
      },
    ),
    /Unknown type ([A-Za-z_0-9]+)/g,
    (match, index) => {
      return (
        <span key={match + index}>
          Unknown type <LegacyLabel>{match}</LegacyLabel>
        </span>
      );
    },
  );
}

export function NoGraphChanges() {
  return (
    <div className="cursor-default">
      <div className="mb-3 flex items-center gap-3">
        <CheckCircledIcon className="h-4 w-auto text-emerald-500" />
        <h2 className="text-neutral-12 text-base font-medium">No Graph Changes</h2>
      </div>
      <p className="text-neutral-10 text-xs">There are no changes in this graph for this graph.</p>
    </div>
  );
}
