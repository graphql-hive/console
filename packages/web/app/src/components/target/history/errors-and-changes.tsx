import { ReactElement, ReactNode } from 'react';
import { clsx } from 'clsx';
import { format } from 'date-fns';
import { ActivityIcon, BoxIcon, CheckIcon, CircleCheckIcon, ExternalLinkIcon } from 'lucide-react';
import reactStringReplace from 'react-string-replace';
import { BreakingChangeTargets } from '@/components/target/history/breaking-change-targets';
import { CompositionErrorMessage } from '@/components/target/history/composition-error-message';
import { CompositionErrorsPopover } from '@/components/target/history/composition-errors-popover';
import {
  explorerLinkForChange,
  type ExplorerLinkPage,
} from '@/components/target/history/explorer-link';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { Accordion } from '@/components/ui/primitives/accordion/accordion';
import { Badge } from '@/components/ui/primitives/badge/badge';
import { Button } from '@/components/ui/primitives/button/button';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { SeverityLevelType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { formatCount } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import * as styles from './errors-and-changes.css';

function ChangeBadge({ content }: { content: string }) {
  return <Badge content={content} variants={{ padding: 'tight', variant: 'warning' }} />;
}

export function labelize(message: string) {
  return reactStringReplace(message.replace(/"/g, "'"), /'((?:[^'\\]|\\.)+?)'/g, (match, i) => (
    <ChangeBadge key={i + match} content={match.replace(/\\'/g, "'")} />
  ));
}

const severityLevelMapping = {
  [SeverityLevelType.Safe]: clsx(styles.class2),
  [SeverityLevelType.Dangerous]: clsx(styles.class3),
} as Record<SeverityLevelType, string>;

export const ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment = graphql(`
  fragment ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment on SchemaCheckConditionalBreakingChangeMetadata {
    period {
      from
      to
    }
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

export const ChangesBlock_SchemaChangeApprovalFragment = graphql(`
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

export const ChangesBlock_SchemaChangeWithUsageFragment = graphql(`
  fragment ChangesBlock_SchemaChangeWithUsageFragment on SchemaChange {
    path
    message(withSafeBasedOnUsageNote: false)
    severityLevel
    severityReason
    approval {
      ...ChangesBlock_SchemaChangeApprovalFragment
    }
    isSafeBasedOnUsage
    isUsageTracked
    kind
    usageStatistics {
      topAffectedOperations {
        hash
        name
        countFormatted
        percentageFormatted
        affectedTargets {
          target {
            id
            slug
          }
        }
      }
      topAffectedClients {
        name
        countFormatted
        percentageFormatted
      }
      affectedTargets {
        target {
          id
          slug
          target {
            id
            slug
          }
        }
        count
        countFormatted
        operationCount
      }
      schemaCoordinate
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
    isUsageTracked
    kind
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
    /** The check being viewed, when there is one: a schema version shows the same changes without. */
    schemaCheckId?: string;
    /** Links each change to its coordinate in Explorer, judged for the page listing it. */
    explorerLinks?: ExplorerLinkPage;
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
  const withUsage = useFragment(ChangesBlock_SchemaChangeWithUsageFragment, props.changesWithUsage);
  const plain = useFragment(ChangesBlock_SchemaChangeFragment, props.changes);
  const keys = rowKeys(
    (withUsage ?? plain ?? []).map(change => `${change.path?.join('.') ?? ''}:${change.message}`),
  );
  return (
    <div>
      {props.title && <ChangesTitle>{props.title}</ChangesTitle>}
      <div
        className={clsx(
          styles.changesBlockDiv,
          props.changesWithUsage ? shared.stack.gap4 : styles.changesBlockDiv3,
        )}
      >
        {props.changesWithUsage?.map((change, index) => (
          <ChangeItem
            schemaCheckId={props.schemaCheckId}
            explorerLinks={props.explorerLinks}
            key={keys[index]}
            change={null}
            changeWithUsage={change}
            conditionBreakingChangeMetadata={props.conditionBreakingChangeMetadata ?? null}
          />
        ))}
        {props.changes?.map((change, index) => (
          <ChangeItem
            schemaCheckId={props.schemaCheckId}
            explorerLinks={props.explorerLinks}
            key={keys[index]}
            change={change}
            changeWithUsage={null}
            conditionBreakingChangeMetadata={props.conditionBreakingChangeMetadata ?? null}
          />
        ))}
      </div>
    </div>
  );
}

export function ChangesTitle(props: { children: ReactNode; 'data-testid'?: string }) {
  return (
    <h2 className={styles.changesTitleH2} data-testid={props['data-testid']}>
      {props.children}
    </h2>
  );
}

/**
 * Keys rows by change, not position: each row's accordion owns its open state, so a positional key
 * would leave "row 3 open" on whatever change a new page or filter puts third. A change is its
 * coordinate and message; an exact repeat falls back to its position rather than colliding.
 */
function rowKeys(ids: ReadonlyArray<string | null | undefined>) {
  const seen = new Set<string>();
  return ids.map((id, index) => {
    if (!id || seen.has(id)) {
      return `${id ?? 'change'}:${index}`;
    }
    seen.add(id);
    return id;
  });
}

function ChangeItem(
  props: {
    conditionBreakingChangeMetadata: FragmentType<
      typeof ChangesBlock_SchemaCheckConditionalBreakingChangeMetadataFragment
    > | null;
    schemaCheckId?: string;
    explorerLinks?: ExplorerLinkPage;
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
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
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

  const usageStatistics = 'usageStatistics' in change ? (change.usageStatistics ?? null) : null;
  const affectedDeployments =
    'affectedAppDeployments' in change ? (change.affectedAppDeployments?.totalCount ?? 0) : 0;
  const explorer = props.explorerLinks ? explorerLinkForChange(change, props.explorerLinks) : null;

  // Older checks have no per-target counts and keep the old layout.
  const targetUsage =
    'usageStatistics' in change &&
    !change.isSafeBasedOnUsage &&
    change.usageStatistics?.affectedTargets?.length &&
    metadata
      ? {
          statistics: change.usageStatistics,
          affectedTargets: change.usageStatistics.affectedTargets,
          coordinate: change.usageStatistics.schemaCoordinate ?? change.path!.join('.'),
          metadata,
        }
      : null;

  // Null when there is nothing to show, which makes the row static rather than open to nothing.
  const details = targetUsage ? (
    <>
      <BreakingChangeTargets
        affectedTargets={targetUsage.affectedTargets}
        targets={targetUsage.metadata.settings.targets}
        coordinate={targetUsage.coordinate}
        period={targetUsage.metadata.period}
      />
      <section className={styles.changeItemSection}>
        <h4 className={styles.changeItemH4}>Affected operations and clients</h4>
        <UsageStatisticsPanels
          usageStatistics={targetUsage.statistics}
          targets={targetUsage.metadata.settings.targets}
          period={targetUsage.metadata.period}
          withTargets
        />
      </section>
      {props.schemaCheckId &&
      'affectedAppDeployments' in change &&
      change.affectedAppDeployments?.edges?.length ? (
        <AffectedAppDeploymentsPanel
          schemaCheckId={props.schemaCheckId}
          coordinate={change.path?.join('.')}
          connection={change.affectedAppDeployments}
        />
      ) : null}
    </>
  ) : 'usageStatistics' in change && change.usageStatistics && metadata ? (
    <div>
      <h4 className={styles.changeItemH42}>Affected Operations (based on usage)</h4>
      <div className={styles.changeItemDiv}>
        <span>Top 10 operations and clients affected by this change based on usage data.</span>
        {metadata && (
          <span className={styles.changeItemSpan}>
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
                    preload={false}
                    className={styles.changeItemLink}
                    to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
                    params={{
                      organizationSlug,
                      projectSlug,
                      targetSlug: target.target.slug,
                      coordinate: change.path!.join('.'),
                    }}
                    search={{ from: metadata.period.from, to: metadata.period.to }}
                    target="_blank"
                  >
                    {target.slug}
                  </Link>
                )}
                {index === arr.length - 1 ? null : index === arr.length - 2 ? ' and ' : ', '}
              </>
            ))}{' '}
            target insights for live usage data.
          </span>
        )}
      </div>
      <UsageStatisticsPanels
        usageStatistics={change.usageStatistics}
        targets={metadata.settings.targets}
        period={metadata.period}
      />
      {props.schemaCheckId &&
      'affectedAppDeployments' in change &&
      change.affectedAppDeployments?.edges?.length ? (
        <div className={styles.changeItemDiv2}>
          <AffectedAppDeploymentsPanel
            schemaCheckId={props.schemaCheckId}
            coordinate={change.path?.join('.')}
            connection={change.affectedAppDeployments}
          />
        </div>
      ) : null}
    </div>
  ) : props.schemaCheckId &&
    'affectedAppDeployments' in change &&
    change.affectedAppDeployments?.edges?.length ? (
    <AffectedAppDeploymentsPanel
      schemaCheckId={props.schemaCheckId}
      coordinate={change.path?.join('.')}
      connection={change.affectedAppDeployments}
    />
  ) : change.severityReason ? (
    <>{change.severityReason}</>
  ) : null;

  return (
    <Accordion
      variant={props.changeWithUsage ? 'boxed' : 'list'}
      items={[
        {
          value: 'item-1',
          label: (
            <div
              className={clsx(
                styles.changeItemDiv3,
                (change.approval && styles.changeItemDiv4) ||
                  (severityLevelMapping[change.severityLevel] ?? styles.changeItemDiv5),
              )}
            >
              <span className={shared.fg.secondary}>{labelize(change.message)}</span>
            </div>
          ),
          trailing:
            change.isSafeBasedOnUsage ||
            usageStatistics ||
            affectedDeployments ||
            change.approval ? (
              <span className={shared.row.gap2}>
                {change.isSafeBasedOnUsage ? (
                  // Zero usage only means "safe" where usage is recorded.
                  change.isUsageTracked ? (
                    <Badge
                      icon={CheckIcon}
                      content="No usage"
                      tooltip={
                        metadata
                          ? `No usage recorded in the last ${formatCount(metadata.settings.retentionInDays, 'day')}`
                          : 'Safe based on usage data'
                      }
                      variants={{ variant: 'info' }}
                    />
                  ) : (
                    <Badge
                      content="Usage not tracked"
                      tooltip="Usage isn't tracked for this kind of change, so it can't be called safe"
                      variants={{ variant: 'secondary' }}
                    />
                  )
                ) : null}
                {usageStatistics ? <UsageBadge usageStatistics={usageStatistics} /> : null}
                {affectedDeployments ? (
                  <Badge
                    icon={BoxIcon}
                    content={formatCount(affectedDeployments, 'deployment')}
                    tooltip={`${formatCount(affectedDeployments, 'app deployment')} affected`}
                    variants={{ variant: 'warning' }}
                  />
                ) : null}
                {change.approval ? <ApprovedByBadge approval={change.approval} /> : null}
              </span>
            ) : undefined,
          action: explorer ? (
            <Button
              variant="ghost"
              size="compact"
              render={
                <Link
                  to="/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename"
                  params={{
                    organizationSlug,
                    projectSlug,
                    targetSlug,
                    typename: explorer.typename,
                  }}
                  search={explorer.search ? { search: explorer.search } : {}}
                  target="_blank"
                  preload={false}
                />
              }
            >
              Explorer
              <ExternalLinkIcon className={styles.changeItemExternalLinkIcon} />
            </Button>
          ) : undefined,
          content:
            change.approval || details ? (
              <div
                className={
                  targetUsage
                    ? styles.changeItemDiv6
                    : props.changeWithUsage
                      ? undefined
                      : styles.changeItemDiv7
                }
              >
                {change.approval && (
                  <SchemaChangeApproval
                    schemaCheckId={props.schemaCheckId}
                    approval={change.approval}
                  />
                )}
                {details}
              </div>
            ) : null,
        },
      ]}
    />
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
  usageStatistics: UsageStatistics;
  targets: InsightsTarget[];
  period: { from: string; to: string };
  /** The targets table links to Insights; operation rows only say where they ran. */
  withTargets?: boolean;
}) {
  const { organizationSlug, projectSlug } = useSlugs('target');
  const operationColumns: ColumnDef<AffectedOperation, unknown>[] = [
    {
      id: 'name',
      header: 'Operation Name',
      meta: { width: 'fill' },
      cell: ({ row }) => {
        const operationName = `${row.original.hash.substring(0, 4)}_${row.original.name}`;
        if (props.withTargets) {
          return <DataTableCell kind="text" value={operationName} mono />;
        }
        const targets = props.targets.flatMap(target =>
          target.target
            ? [
                {
                  label: target.slug,
                  link: {
                    to: '/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash' as const,
                    params: {
                      organizationSlug,
                      projectSlug,
                      targetSlug: target.target.slug,
                      operationName,
                      operationHash: row.original.hash,
                    },
                    search: { from: props.period.from, to: props.period.to },
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
    ...(props.withTargets
      ? [
          {
            id: 'seenIn',
            header: 'Seen in',
            meta: { width: 'md' },
            cell: ({ row }) => (
              <DataTableCell
                kind="text"
                tone="muted"
                value={(row.original.affectedTargets ?? [])
                  .map(affected => affected.target.slug)
                  .join(', ')}
              />
            ),
          } satisfies ColumnDef<AffectedOperation, unknown>,
        ]
      : []),
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
    <div className={styles.usageStatisticsPanelsDiv}>
      <div className={shared.fillShrinkable}>
        <DataTable
          data={props.usageStatistics.topAffectedOperations}
          columns={operationColumns}
          getRowId={operation => operation.hash}
          pagination={{ kind: 'none' }}
          variants={{ bordered: !!props.withTargets }}
          emptyMessage="No affected operations."
        />
      </div>
      <div className={shared.fillShrinkable}>
        <DataTable
          data={props.usageStatistics.topAffectedClients}
          columns={clientColumns}
          getRowId={client => client.name}
          pagination={{ kind: 'none' }}
          variants={{ bordered: !!props.withTargets }}
          emptyMessage="No affected clients."
        />
      </div>
    </div>
  );
}

function AffectedAppDeploymentsPanel(props: {
  schemaCheckId: string;
  coordinate: string | undefined;
  connection: AffectedDeploymentConnection;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const appVersionLink = (deployment: AffectedDeployment) => ({
    to: '/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion' as const,
    params: {
      organizationSlug,
      projectSlug,
      targetSlug,
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
                  <Button variant="link">
                    {deployment.totalAffectedOperations}{' '}
                    {deployment.totalAffectedOperations === 1 ? 'operation' : 'operations'}
                  </Button>
                }
                side="left"
                width="md"
                arrow
                content={
                  <div className={styles.affectedAppDeploymentsPanelDiv}>
                    <h5 className={styles.affectedAppDeploymentsPanelH5}>Affected Operations</h5>
                    <ScrollArea maxHeight="sm">
                      <ul className={styles.affectedAppDeploymentsPanelUl}>
                        {deployment.affectedOperations.edges.map(({ node: op }) => (
                          <li key={op.hash} className={shared.fg.default}>
                            {op.name || `[anonymous] (${op.hash.substring(0, 8)}...)`}
                          </li>
                        ))}
                      </ul>
                    </ScrollArea>
                    <Link
                      {...appVersionLink(deployment)}
                      className={styles.affectedAppDeploymentsPanelLink}
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
      <h4 className={styles.affectedAppDeploymentsPanelH4}>Affected App Deployments</h4>
      <p className={styles.affectedAppDeploymentsPanelP}>
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
            organizationSlug,
            projectSlug,
            targetSlug,
            schemaCheckId: props.schemaCheckId,
          }}
          search={{ coordinate: props.coordinate }}
          className={styles.affectedAppDeploymentsPanelLink2}
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
    <Badge
      icon={CheckIcon}
      content="Approved"
      tooltip={`Approved by ${approvalName} on ${format(new Date(approval.approvedAt), 'do MMMM yyyy')}`}
      variants={{ variant: 'success' }}
    />
  );
}

function UsageBadge(props: { usageStatistics: UsageStatistics }) {
  const operations = props.usageStatistics.topAffectedOperations.length;
  const clients = props.usageStatistics.topAffectedClients.length;
  // Ten is the cap, so ten means at least ten.
  const operationsText = formatCount(operations, 'operation', operations >= 10 ? '10+' : undefined);
  return (
    <Badge
      icon={ActivityIcon}
      content={clients ? formatCount(clients, 'client') : operationsText}
      tooltip={`${operationsText} by ${formatCount(clients, 'client')} affected`}
      variants={{ variant: 'critical' }}
    />
  );
}

function SchemaChangeApproval(props: {
  approval: FragmentType<typeof ChangesBlock_SchemaChangeApprovalFragment>;
  schemaCheckId?: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const approval = useFragment(ChangesBlock_SchemaChangeApprovalFragment, props.approval);
  const approvalName =
    approval.approvedBy?.displayName ?? approval.cliApprovalMetadata?.displayName ?? '<unknown>';
  const approvalDate = format(new Date(approval.approvedAt), 'do MMMM yyyy');
  const schemaCheckPath =
    '/' + [organizationSlug, projectSlug, targetSlug, 'checks', approval.schemaCheckId].join('/');

  return (
    <div className={styles.schemaChangeApprovalDiv}>
      This breaking change was manually{' '}
      {approval.schemaCheckId === props.schemaCheckId ? (
        <>
          {' '}
          approved by {approvalName} in this schema check on {approvalDate}.
        </>
      ) : (
        <a href={schemaCheckPath} className={styles.schemaChangeApprovalA}>
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
    <div className={styles.compositionErrorsListDiv}>
      <ChangesTitle data-testid="composition-errors-title">
        {props.title}
        <CompositionErrorsPopover />
      </ChangesTitle>
      {props.description ? (
        <p className={styles.compositionErrorsListP}>{props.description}</p>
      ) : null}
      <ul>
        {props.errors.map((error, index) => (
          <li key={index} className={styles.compositionErrorsListLi}>
            <CompositionErrorMessage message={error.message} />
          </li>
        ))}
      </ul>
    </div>
  );
}

export function NoGraphChanges() {
  return (
    <div className={styles.noGraphChangesDiv}>
      <div className={styles.noGraphChangesDiv2}>
        <CircleCheckIcon className={styles.noGraphChangesCircleCheckIcon} />
        <h2 className={styles.noGraphChangesH2}>No Graph Changes</h2>
      </div>
      <p className={styles.noGraphChangesP}>There are no changes in this graph for this graph.</p>
    </div>
  );
}
