import React, { ReactElement, ReactNode, useMemo } from 'react';
import { clsx } from 'clsx';
import { ActivityIcon, UsersIcon } from 'lucide-react';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Popover } from '@/components/base/floating/popover/popover';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Markdown } from '@/components/v2/markdown';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { formatNumber, toDecimal, useSlugs } from '@/lib/hooks';
import { capitalize, cn } from '@/lib/utils';
import { Link, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import AvailabilityBar from './availability-bar';
import { useDescriptionsVisibleToggle, useSchemaExplorerContext } from './provider';
import { SupergraphMetadataList } from './super-graph-metadata';
import { matchesSubgraphFilter, useExplorerFieldFiltering } from './utils';

export function Description(props: { description: string }) {
  const { isDescriptionsVisible } = useDescriptionsVisibleToggle();

  return (
    <div
      className={clsx('mb-2 mt-0 block max-w-screen-sm', {
        hidden: !isDescriptionsVisible,
      })}
    >
      <Markdown
        className={clsx('text-fg-secondary text-left text-sm')}
        content={props.description}
      />
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
    <div className="ml-3 flex flex-row items-center gap-2 text-xs">
      <div className="grow">
        <div className="min-w-[25px] text-center">{formatNumber(usage.total)}</div>
      </div>
      {availability !== null ? (
        <div className="min-w-[25px]">
          <Popover
            trigger={
              <button type="button" aria-label="Field stats" className="block w-full cursor-help">
                <AvailabilityBar availability={availability} />
              </button>
            }
            openOnHover
            align="end"
            width="auto"
            content={
              <div className="text-left">
                <div className="mb-1 text-lg font-bold">{capitalize(kindLabel)} Stats</div>
                {hasFieldLevelMetrics ? (
                  <div className="max-w-60">
                    <span className="font-bold">Requests</span> counts how many client requests
                    asked for a field, whereas <span className="font-bold">Resolutions</span> counts
                    the actual number of times your backend executed code to fetch that field's data
                    (which can multiply within lists or drop to zero if a parent returned null).
                  </div>
                ) : null}
                <div className="mt-4 space-y-1 text-left">
                  <div>
                    <span className="font-bold">{formatNumber(usage.total)} Requests</span>{' '}
                    {hasFieldLevelMetrics ? 'with' : null}
                  </div>
                  {usage.totalResolutions ? (
                    <div className="font-bold">
                      {formatNumber(usage.totalResolutions)} Resolutions
                    </div>
                  ) : null}
                  {usage.errorTotal ? (
                    <div className="font-bold">{formatNumber(usage.errorTotal)} Errors</div>
                  ) : null}
                  <div>
                    for{' '}
                    <span className="text-warning">{availability.toFixed(2)}% Availability</span>
                  </div>
                </div>
              </div>
            }
          />
        </div>
      ) : null}
      <Popover
        trigger={
          <button type="button" aria-label="Usage" className="cursor-help text-xl">
            <ActivityIcon className="h-6 w-auto" />
          </button>
        }
        openOnHover
        align="end"
        // The table inside fills its container, so the popup needs a width of its own.
        width="lg"
        content={
          <div>
            <div className="mb-1 text-lg font-medium">{capitalize(kindLabel)} Usage</div>
            {usage.isUsed === false ? (
              <div>This {kindLabel} is currently not in use.</div>
            ) : (
              <div>
                <ul>
                  <li>
                    This {kindLabel} has been queried in{' '}
                    <span className="text-fg font-medium">{formatNumber(usage.total)}</span>{' '}
                    requests.
                  </li>
                  <li>
                    <span className="text-fg font-medium">{toDecimal(percentage)}%</span> of all
                    requests use this {kindLabel}.
                  </li>
                </ul>

                {Array.isArray(usage.topOperations) && (
                  <div className="mt-4">
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
          <button type="button" aria-label="Client usage" className="cursor-help p-1 text-xl">
            <UsersIcon className="size-4" />
          </button>
        }
        openOnHover
        align="end"
        width="auto"
        content={
          <>
            <div className="mb-1 text-lg font-medium">Client Usage</div>

            {Array.isArray(usage.usedByClients) && usage.usedByClients.length > 0 ? (
              <>
                <div className="mb-2">This {kindLabel} is used by the following clients:</div>
                <ul>
                  {usage.usedByClients.map(clientName => (
                    <li key={clientName} className="font-bold">
                      <Link
                        className="text-warning hover:underline hover:underline-offset-2"
                        to="/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name"
                        params={{
                          organizationSlug,
                          projectSlug,
                          targetSlug,
                          name: clientName,
                        }}
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
      trigger={<span className="line-through">{props.children}</span>}
      side="right"
      sideOffset={5}
      maxWidth="screen"
      content={
        <>
          <div className="mb-2">Deprecation reason</div>
          <Markdown className="text-fg-secondary" content={props.deprecationReason} />
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
    <div className="border-line rounded-md border-2">
      <div className="flex flex-row justify-between p-4">
        <div>
          <div className="flex flex-row items-center gap-2">
            <div className="text-fg-secondary font-normal">{props.kind}</div>
            <div className="font-semibold">
              <GraphQLTypeAsLink type={props.name} />
            </div>
          </div>
          {props.description && <Description description={props.description} />}
        </div>
        {Array.isArray(props.implements) && props.implements.length > 0 && (
          <div className="text-fg-secondary flex flex-row items-center text-sm">
            <div className="mx-2">implements</div>
            <div className="flex flex-row gap-2">
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
        'flex flex-row items-center justify-between p-4 text-sm',
        props.index % 2 ? '' : 'bg-surface-stripe',
        props.className,
      )}
    >
      {props.children}
    </div>
  );
}

export function ExplorerFilteredEmptyState() {
  return (
    <div className="text-fg-secondary border-line rounded-md border border-dashed px-4 py-8 text-center text-sm">
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
    <div className="flex flex-col">
      {sortedAndFilteredFields.map((field, i) => {
        const coordinate = `${props.typeName}.${field.name}`;
        return (
          <GraphQLTypeCardListItem key={field.name} index={i}>
            <div>
              <div className="flex w-full flex-row items-center justify-between">
                <div className="text-fg-secondary">
                  <DeprecationNote deprecationReason={field.deprecationReason}>
                    <LinkToCoordinatePage coordinate={coordinate} className="text-fg font-semibold">
                      {field.name}
                    </LinkToCoordinatePage>
                  </DeprecationNote>
                  <span className="mr-1">:</span>
                  <GraphQLTypeAsLink className="font-semibold" type={field.type} />
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
  const router = useRouter();
  const typename = props.type.replace(/[[\]!]+/g, '');

  return (
    <Popover
      trigger={
        <button
          type="button"
          className={cn('hover:underline hover:underline-offset-4', props.className)}
        >
          {props.type}
        </button>
      }
      side="right"
      arrow
      content={
        <div className="flex flex-col gap-y-2">
          <p>
            <Link
              className="text-xs font-normal hover:underline hover:underline-offset-2"
              to="/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
                typename,
              }}
              search={router.latestLocation.search}
            >
              Visit in <span className="font-medium">Explorer</span>
            </Link>
            <span className="text-fg-secondary text-xs"> - displays a full type</span>
          </p>
          <p>
            <Link
              className="text-xs font-normal hover:underline hover:underline-offset-2"
              to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
                coordinate: typename,
              }}
              search={router.latestLocation.search}
            >
              Visit in <span className="font-medium">Insights</span>
            </Link>
            <span className="text-fg-secondary text-xs"> - usage insights</span>
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
  const router = useRouter();

  return (
    <Link
      ref={ref}
      className={cn('hover:underline hover:underline-offset-2', props.className)}
      to="/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate"
      params={{
        organizationSlug,
        projectSlug,
        targetSlug,
        coordinate: props.coordinate,
      }}
      search={router.latestLocation.search}
    >
      {props.children}
    </Link>
  );
});

const getRandomWidth = () => {
  const values = ['w-32', 'w-48', 'w-64', 'w-96'];

  return values[Math.floor(Math.random() * values.length)];
};

export const GraphQLFieldsSkeleton = (props: { count?: number }) => {
  const widths = useMemo(() => {
    const count = props.count ?? 5;

    return Array.from({ length: count }, () => getRandomWidth());
  }, [props.count]);

  return (
    <div className="flex w-full flex-col">
      {widths.map((width, index) => (
        <GraphQLTypeCardListItem key={index} index={index} className="w-full">
          <div className="flex w-full flex-row items-center gap-2">
            <Skeleton className={cn('bg-surface-skeleton my-1 h-4', width)} />
            <div className="ml-auto flex flex-row items-center gap-2">
              <Skeleton className="bg-surface-skeleton my-1 size-4" />
              <Skeleton className="bg-surface-skeleton my-1 size-4" />
              <Skeleton className="bg-surface-skeleton my-1 size-4" />
            </div>
          </div>
        </GraphQLTypeCardListItem>
      ))}
    </div>
  );
};

export const GraphQLTypeCardSkeleton = (props: { children: ReactNode }) => {
  return (
    <div className="border-line-subtle rounded-md border-2">
      <div className="flex flex-row justify-between p-4">
        <div className="flex flex-row items-center gap-2">
          <Skeleton className="bg-surface-skeleton my-1 h-4 w-32" />
        </div>
      </div>
      <div>{props.children}</div>
    </div>
  );
};
