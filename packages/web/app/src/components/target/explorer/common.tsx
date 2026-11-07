import React, { ReactElement, ReactNode, useMemo } from 'react';
import { clsx } from 'clsx';
import { ActivityIcon, UsersIcon } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { Markdown } from '@/components/ui/markdown';
import { Popover } from '@/components/ui/primitives/floating/popover/popover';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { Skeleton } from '@/components/ui/primitives/skeleton/skeleton';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { formatNumber, toDecimal, useSlugs } from '@/lib/hooks';
import { carriedRange } from '@/lib/hooks/use-date-range-controller';
import { capitalize, cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { Link, useLocation } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import AvailabilityBar from './availability-bar';
import { useDescriptionsVisibleToggle, useSchemaExplorerContext } from './provider';
import { SupergraphMetadataList } from './super-graph-metadata';
import { matchesSubgraphFilter, useExplorerFieldFiltering } from './utils';
import { explorerCommonStyles } from './common.css';

export function Description(props: { description: string }) {
  const { isDescriptionsVisible } = useDescriptionsVisibleToggle();

  return (
    <div className={explorerCommonStyles.description({ hidden: !isDescriptionsVisible })}>
      <Markdown className={explorerCommonStyles.descriptionText} content={props.description} />
    </div>
  );
}

const SchemaExplorerUsageStats_UsageFragment = graphql(`
  fragment SchemaExplorerUsageStats_UsageFragment on SchemaCoordinateUsage {
    total
    totalResolutions
    errorTotal
    isUsed
    usedByClients
    topOperations(limit: 5) {
      count
      name
      hash
    }
  }
`);

type TopOperation = NonNullable<
  DocumentType<typeof SchemaExplorerUsageStats_UsageFragment>['topOperations']
>[number];

export function SchemaExplorerUsageStats(props: {
  usage: FragmentType<typeof SchemaExplorerUsageStats_UsageFragment>;
  totalRequests: number;
  kindLabel?: string;
}) {
  const { search } = useLocation();
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const usage = useFragment(SchemaExplorerUsageStats_UsageFragment, props.usage);
  const percentage = props.totalRequests ? (usage.total / props.totalRequests) * 100 : 0;
  const hasFieldLevelMetrics = !!(usage.errorTotal != null || usage.totalResolutions);
  const availability = hasFieldLevelMetrics
    ? (1.0 - (usage.errorTotal ?? 0) / Math.max(usage.totalResolutions ?? 1, 1)) * 100.0
    : null;

  const kindLabel = useMemo(() => props.kindLabel ?? 'field', [props.kindLabel]);

  const topOperationColumns: ColumnDef<TopOperation, unknown>[] = [
    {
      id: 'name',
      header: 'Top 5 Operations',
      meta: { width: 'fill' },
      cell: ({ row }) => {
        const operationName = `${row.original.hash.substring(0, 4)}_${row.original.name}`;
        return (
          <DataTableCell
            kind="link"
            tone="accent"
            mono
            truncate
            label={operationName}
            link={{
              to: '/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash',
              params: {
                organizationSlug,
                projectSlug,
                targetSlug,
                operationName,
                operationHash: row.original.hash,
              },
              search: carriedRange(search),
            }}
          />
        );
      },
    },
    {
      id: 'count',
      header: 'Reqs',
      meta: { align: 'right', width: 'xs' },
      cell: ({ row }) => <DataTableCell kind="number" value={formatNumber(row.original.count)} />,
    },
    {
      id: 'share',
      header: 'Of total',
      meta: { align: 'right', width: 'xs' },
      cell: ({ row }) => (
        <DataTableCell
          kind="number"
          value={`${toDecimal((row.original.count / props.totalRequests) * 100)}%`}
        />
      ),
    },
  ];

  return (
    <div className={explorerCommonStyles.usage}>
      <div className={shared.grow}>
        <div className={explorerCommonStyles.usageTotal}>{formatNumber(usage.total)}</div>
      </div>
      {availability !== null ? (
        <div className={explorerCommonStyles.usageCell}>
          <Popover
            trigger={
              <button
                type="button"
                aria-label="Field stats"
                className={explorerCommonStyles.usageTrigger}
              >
                <AvailabilityBar availability={availability} />
              </button>
            }
            openOnHover
            align="end"
            width="auto"
            content={
              <div className={explorerCommonStyles.usagePopover}>
                <div className={explorerCommonStyles.usagePopoverTitle}>
                  {capitalize(kindLabel)} Stats
                </div>
                {hasFieldLevelMetrics ? (
                  <div className={explorerCommonStyles.usagePopoverBody}>
                    <span className={shared.weight.bold}>Requests</span> counts how many client
                    requests asked for a field, whereas{' '}
                    <span className={shared.weight.bold}>Resolutions</span> counts the actual number
                    of times your backend executed code to fetch that field's data (which can
                    multiply within lists or drop to zero if a parent returned null).
                  </div>
                ) : null}
                <div className={explorerCommonStyles.usageBreakdown}>
                  <div>
                    <span className={shared.weight.bold}>{formatNumber(usage.total)} Requests</span>{' '}
                    {hasFieldLevelMetrics ? 'with' : null}
                  </div>
                  {usage.totalResolutions ? (
                    <div className={shared.weight.bold}>
                      {formatNumber(usage.totalResolutions)} Resolutions
                    </div>
                  ) : null}
                  {usage.errorTotal ? (
                    <div className={shared.weight.bold}>
                      {formatNumber(usage.errorTotal)} Errors
                    </div>
                  ) : null}
                  <div>
                    for{' '}
                    <span className={shared.fg.warning}>
                      {availability.toFixed(2)}% Availability
                    </span>
                  </div>
                </div>
              </div>
            }
          />
        </div>
      ) : null}
      <Popover
        trigger={
          <button type="button" aria-label="Usage" className={explorerCommonStyles.activityButton}>
            <ActivityIcon className={explorerCommonStyles.activityIcon} />
          </button>
        }
        openOnHover
        align="end"
        // The table inside fills its container, so the popup needs a width of its own.
        width="lg"
        content={
          <div>
            <div className={explorerCommonStyles.popoverHeading}>{capitalize(kindLabel)} Usage</div>
            {usage.isUsed === false ? (
              <div>This {kindLabel} is currently not in use.</div>
            ) : (
              <div>
                <ul>
                  <li>
                    This {kindLabel} has been queried in{' '}
                    <span className={explorerCommonStyles.emphasis}>
                      {formatNumber(usage.total)}
                    </span>{' '}
                    requests.
                  </li>
                  <li>
                    <span className={explorerCommonStyles.emphasis}>{toDecimal(percentage)}%</span>{' '}
                    of all requests use this {kindLabel}.
                  </li>
                </ul>

                {Array.isArray(usage.topOperations) && (
                  <div className={explorerCommonStyles.popoverFooter}>
                    <DataTable
                      data={usage.topOperations}
                      columns={topOperationColumns}
                      getRowId={operation => operation.hash}
                      pagination={{ kind: 'none' }}
                      variants={{ onSurface: 'raised', bordered: false, striped: false }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        }
      />

      <Popover
        trigger={
          <button
            type="button"
            aria-label="Client usage"
            className={explorerCommonStyles.clientsButton}
          >
            <UsersIcon className={explorerCommonStyles.clientsIcon} />
          </button>
        }
        openOnHover
        align="end"
        width="auto"
        content={
          <>
            <div className={explorerCommonStyles.popoverHeading}>Client Usage</div>

            {Array.isArray(usage.usedByClients) && usage.usedByClients.length > 0 ? (
              <>
                <div className={explorerCommonStyles.clientsNote}>
                  This {kindLabel} is used by the following clients:
                </div>
                <ul>
                  {usage.usedByClients.map(clientName => (
                    <li key={clientName} className={shared.weight.bold}>
                      <Link
                        className={explorerCommonStyles.clientsLink}
                        to="/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name"
                        params={{
                          organizationSlug,
                          projectSlug,
                          targetSlug,
                          name: clientName,
                        }}
                        search={carriedRange(search)}
                      >
                        {clientName}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <div>This {kindLabel} is not used by any client.</div>
            )}
          </>
        }
      />
    </div>
  );
}

const GraphQLInputFields_InputFieldFragment = graphql(`
  fragment GraphQLInputFields_InputFieldFragment on GraphQLInputField {
    name
    description
    type
    isDeprecated
    deprecationReason
    supergraphMetadata {
      ownedByServiceNames
      metadata {
        name
        content
      }
    }
    usage {
      total
      ...SchemaExplorerUsageStats_UsageFragment
    }
  }
`);

const GraphQLTypeCard_SupergraphMetadataFragment = graphql(`
  fragment GraphQLTypeCard_SupergraphMetadataFragment on SupergraphMetadata {
    ownedByServiceNames
    ...SupergraphMetadataList_SupergraphMetadataFragment
  }
`);

export function DeprecationNote(props: {
  deprecationReason: string | null | undefined;
  children: ReactNode;
}) {
  if (!props.deprecationReason) {
    return <>{props.children}</>;
  }

  return (
    <Tooltip
      trigger={<span className={shared.lineThrough}>{props.children}</span>}
      side="right"
      sideOffset={5}
      maxWidth="screen"
      content={
        <>
          <div className={explorerCommonStyles.deprecation}>Deprecation reason</div>
          <Markdown
            className={explorerCommonStyles.deprecationText}
            content={props.deprecationReason}
          />
        </>
      }
    />
  );
}

export function GraphQLTypeCard(props: {
  kind: string;
  name: string;
  description?: string | null;
  implements?: string[];
  totalRequests?: number;
  usage?: FragmentType<typeof SchemaExplorerUsageStats_UsageFragment>;
  supergraphMetadata?: FragmentType<typeof GraphQLTypeCard_SupergraphMetadataFragment> | null;
  children: ReactNode;
}): ReactElement | null {
  const supergraphMetadata = useFragment(
    GraphQLTypeCard_SupergraphMetadataFragment,
    props.supergraphMetadata,
  );
  const { subgraphs } = useSchemaExplorerContext();

  if (!matchesSubgraphFilter(supergraphMetadata?.ownedByServiceNames, subgraphs)) {
    return null;
  }

  return (
    <div className={explorerCommonStyles.card}>
      <div className={explorerCommonStyles.cardHeader}>
        <div>
          <div className={explorerCommonStyles.cardTitle}>
            <div className={explorerCommonStyles.cardKind}>{props.kind}</div>
            <div className={shared.weight.semibold}>
              <GraphQLTypeAsLink type={props.name} />
            </div>
          </div>
          {props.description && <Description description={props.description} />}
        </div>
        {Array.isArray(props.implements) && props.implements.length > 0 && (
          <div className={explorerCommonStyles.cardImplements}>
            <div className={explorerCommonStyles.cardImplementsLabel}>implements</div>
            <div className={explorerCommonStyles.cardImplementsList}>
              {props.implements.map(t => (
                <GraphQLTypeAsLink key={t} type={t} />
              ))}
            </div>
          </div>
        )}
        {props.usage && typeof props.totalRequests !== 'undefined' && (
          <SchemaExplorerUsageStats
            kindLabel={props.kind}
            totalRequests={props.totalRequests}
            usage={props.usage}
          />
        )}
        {supergraphMetadata && <SupergraphMetadataList supergraphMetadata={supergraphMetadata} />}
      </div>
      <div>{props.children}</div>
    </div>
  );
}

export function GraphQLTypeCardListItem(props: {
  children: ReactNode;
  index: number;
  className?: string;
  onClick?: () => void;
}): ReactElement {
  return (
    <div
      onClick={props.onClick}
      className={clsx(
        explorerCommonStyles.listItem({ striped: !(props.index % 2) }),
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function ExplorerFilteredEmptyState() {
  return (
    <div className={explorerCommonStyles.empty}>
      No schema coordinates match the active filters.
    </div>
  );
}

export function GraphQLInputFields(props: {
  typeName: string;
  fields: FragmentType<typeof GraphQLInputFields_InputFieldFragment>[];
  totalRequests?: number;
}): ReactElement {
  const fields = useFragment(GraphQLInputFields_InputFieldFragment, props.fields);

  const sortedAndFilteredFields = useExplorerFieldFiltering({
    fields,
  });

  if (sortedAndFilteredFields.length === 0) {
    return <ExplorerFilteredEmptyState />;
  }

  return (
    <div className={shared.stack.base}>
      {sortedAndFilteredFields.map((field, i) => {
        const coordinate = `${props.typeName}.${field.name}`;
        return (
          <GraphQLTypeCardListItem key={field.name} index={i}>
            <div>
              <div className={explorerCommonStyles.inputField}>
                <div className={shared.fg.secondary}>
                  <DeprecationNote deprecationReason={field.deprecationReason}>
                    <LinkToCoordinatePage
                      coordinate={coordinate}
                      className={explorerCommonStyles.inputFieldName}
                    >
                      {field.name}
                    </LinkToCoordinatePage>
                  </DeprecationNote>
                  <span className={explorerCommonStyles.colon}>:</span>
                  <GraphQLTypeAsLink
                    className={explorerCommonStyles.inputFieldType}
                    type={field.type}
                  />
                </div>
                {typeof props.totalRequests === 'number' && (
                  <SchemaExplorerUsageStats
                    totalRequests={props.totalRequests}
                    usage={field.usage}
                  />
                )}
              </div>
              {field.description && <Description description={field.description} />}
            </div>
          </GraphQLTypeCardListItem>
        );
      })}
    </div>
  );
}

export function GraphQLTypeAsLink(props: { type: string; className?: string }): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { search } = useLocation();
  const typename = props.type.replace(/[[\]!]+/g, '');

  return (
    <Popover
      trigger={
        <button type="button" className={cn(explorerCommonStyles.typeLink, props.className)}>
          {props.type}
        </button>
      }
      side="right"
      arrow
      content={
        <div className={explorerCommonStyles.typeLinkPopover}>
          <p>
            <Link
              className={explorerCommonStyles.typeLinkAction}
              to="/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
                typename,
              }}
              search={search}
            >
              Visit in <span className={shared.weight.medium}>Explorer</span>
            </Link>
            <span className={explorerCommonStyles.typeLinkHint}> - displays a full type</span>
          </p>
          <p>
            <Link
              className={explorerCommonStyles.typeLinkAction}
              to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
                coordinate: typename,
              }}
              search={carriedRange(search)}
            >
              Visit in <span className={shared.weight.medium}>Insights</span>
            </Link>
            <span className={explorerCommonStyles.typeLinkHint}> - usage insights</span>
          </p>
        </div>
      }
    />
  );
}

export const LinkToCoordinatePage = React.forwardRef<
  HTMLAnchorElement,
  {
    coordinate: string;
    children: ReactNode;
    className?: string;
  }
>((props, ref) => {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { search } = useLocation();

  return (
    <Link
      ref={ref}
      className={cn(explorerCommonStyles.link, props.className)}
      to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
      params={{
        organizationSlug,
        projectSlug,
        targetSlug,
        coordinate: props.coordinate,
      }}
      search={carriedRange(search)}
    >
      {props.children}
    </Link>
  );
});

const getRandomWidth = () => {
  const values = Object.values(explorerCommonStyles.skeletonWidth);

  return values[Math.floor(Math.random() * values.length)];
};

export const GraphQLFieldsSkeleton = (props: { count?: number }) => {
  const widths = useMemo(() => {
    const count = props.count ?? 5;

    return Array.from({ length: count }, () => getRandomWidth());
  }, [props.count]);

  return (
    <div className={explorerCommonStyles.fieldsSkeleton}>
      {widths.map((width, index) => (
        <GraphQLTypeCardListItem
          key={index}
          index={index}
          className={explorerCommonStyles.fieldsSkeletonItem}
        >
          <div className={explorerCommonStyles.fieldsSkeletonRow}>
            <span className={cn(explorerCommonStyles.fieldsSkeletonName, width)}>
              <Skeleton variants={{ width: 'full' }} />
            </span>
            <div className={explorerCommonStyles.fieldsSkeletonActions}>
              <span className={explorerCommonStyles.skeletonIcon}>
                <Skeleton variants={{ shape: 'block' }} />
              </span>
              <span className={explorerCommonStyles.skeletonIcon}>
                <Skeleton variants={{ shape: 'block' }} />
              </span>
              <span className={explorerCommonStyles.skeletonIcon}>
                <Skeleton variants={{ shape: 'block' }} />
              </span>
            </div>
          </div>
        </GraphQLTypeCardListItem>
      ))}
    </div>
  );
};

export const GraphQLTypeCardSkeleton = (props: { children: ReactNode }) => {
  return (
    <div className={explorerCommonStyles.cardSkeleton}>
      <div className={explorerCommonStyles.cardSkeletonHeader}>
        <div className={explorerCommonStyles.cardSkeletonTitle}>
          <span className={explorerCommonStyles.cardSkeletonName}>
            <Skeleton variants={{ width: 'full' }} />
          </span>
        </div>
      </div>
      <div>{props.children}</div>
    </div>
  );
};
