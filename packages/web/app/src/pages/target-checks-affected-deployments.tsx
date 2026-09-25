import { useMemo, useRef, useState } from 'react';
import { useQuery } from 'urql';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { LayoutContent } from '@/components/layouts/layout-content';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

const AffectedDeploymentsQuery = graphql(`
  query AffectedDeploymentsQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $schemaCheckId: ID!
    $first: Int
    $after: String
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      schemaCheck(id: $schemaCheckId) {
        __typename
        id
        ... on FailedSchemaCheck {
          breakingSchemaChanges {
            edges {
              node {
                path
                message(withSafeBasedOnUsageNote: false)
                affectedAppDeployments(first: $first, after: $after) {
                  edges {
                    cursor
                    node {
                      id
                      name
                      version
                      totalAffectedOperations
                      activatedAt
                      retiredAt
                      lastUsed
                    }
                  }
                  totalCount
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }
        }
        ... on SuccessfulSchemaCheck {
          breakingSchemaChanges {
            edges {
              node {
                path
                message(withSafeBasedOnUsageNote: false)
                affectedAppDeployments(first: $first, after: $after) {
                  edges {
                    cursor
                    node {
                      id
                      name
                      version
                      totalAffectedOperations
                      activatedAt
                      retiredAt
                      lastUsed
                    }
                  }
                  totalCount
                  pageInfo {
                    hasNextPage
                    endCursor
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`);

type AffectedDeployment = {
  id: string;
  name: string;
  version: string;
  totalOperations: number;
  activatedAt: string | null;
  retiredAt: string | null;
  lastUsed: string | null;
};

const PAGE_SIZE = 20;

const EMPTY_PAGE = {
  deployments: [] as AffectedDeployment[],
  hasNextPage: false,
  endCursor: null as string | null | undefined,
  totalCount: 0,
};

function TargetChecksAffectedDeploymentsContent(props: {
  schemaCheckId: string;
  coordinate?: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [endCursors, setEndCursors] = useState<string[]>([]);

  const [data] = useQuery({
    query: AffectedDeploymentsQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      schemaCheckId: props.schemaCheckId,
      first: PAGE_SIZE,
      after: endCursors[endCursors.length - 1] ?? null,
    },
  });

  const page = useMemo(() => {
    const schemaCheck = data.data?.target?.schemaCheck;
    if (!schemaCheck) {
      return EMPTY_PAGE;
    }

    const breakingChanges =
      'breakingSchemaChanges' in schemaCheck ? schemaCheck.breakingSchemaChanges : null;

    if (!breakingChanges?.edges) {
      return EMPTY_PAGE;
    }

    for (const edge of breakingChanges.edges) {
      const change = edge.node;
      const coordinate = change.path?.join('.') ?? 'unknown';

      if (coordinate === props.coordinate && change.affectedAppDeployments) {
        return {
          deployments:
            change.affectedAppDeployments.edges?.map(
              (edge): AffectedDeployment => ({
                id: edge.node.id,
                name: edge.node.name,
                version: edge.node.version,
                totalOperations: edge.node.totalAffectedOperations,
                activatedAt: edge.node.activatedAt ?? null,
                retiredAt: edge.node.retiredAt ?? null,
                lastUsed: edge.node.lastUsed ?? null,
              }),
            ) ?? [],
          hasNextPage: change.affectedAppDeployments.pageInfo.hasNextPage,
          endCursor: change.affectedAppDeployments.pageInfo.endCursor,
          totalCount: change.affectedAppDeployments.totalCount,
        };
      }
    }

    return EMPTY_PAGE;
  }, [data.data?.target?.schemaCheck, props.coordinate]);

  // A page in flight first arrives partial from the cache, with the connection null, so keep
  // showing the last settled page until the network result lands.
  const loading = data.fetching || data.stale;
  const settledPage = useRef(EMPTY_PAGE);
  if (!loading) {
    settledPage.current = page;
  }
  const { deployments, hasNextPage, endCursor, totalCount } = loading ? settledPage.current : page;

  if (data.error) {
    return (
      <QueryError organizationSlug={organizationSlug} error={data.error} showLogoutButton={false} />
    );
  }

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
      cell: ({ row }) =>
        row.original.lastUsed ? (
          <DataTableCell kind="time" date={row.original.lastUsed} mode="relative-info" />
        ) : (
          <DataTableCell kind="placeholder" />
        ),
    },
    {
      id: 'totalOperations',
      header: 'Total Operations',
      meta: { align: 'right' },
      cell: ({ row }) => (
        <DataTableCell
          kind="link"
          tone="accent"
          label={`${row.original.totalOperations} ${
            row.original.totalOperations === 1 ? 'operation' : 'operations'
          }`}
          link={appVersionLink(row.original)}
        />
      ),
    },
  ];

  return (
    <>
      <Meta title="Affected App Deployments" />
      <div className="flex h-full flex-1 flex-col py-6">
        <SubPageLayoutHeader
          subPageTitle={
            <span className="flex items-center">
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId"
                params={{
                  organizationSlug,
                  projectSlug,
                  targetSlug,
                  schemaCheckId: props.schemaCheckId,
                }}
                className="text-orange-500 hover:underline"
              >
                Schema Check
              </Link>
              <span className="text-neutral-10 mx-2">/</span>
              <span>Affected App Deployments</span>
            </span>
          }
          description={
            props.coordinate ? (
              <>
                App deployments affected by breaking change to{' '}
                <code className="bg-neutral-5 rounded-sm px-1 py-0.5 font-mono text-orange-400">
                  {props.coordinate}
                </code>
              </>
            ) : (
              'All app deployments affected by breaking changes in this schema check'
            )
          }
        />
        <div className="mt-4" />
        {loading && deployments.length === 0 ? (
          <div className="flex h-fit flex-1 items-center justify-center">
            <div className="flex flex-col items-center">
              <Spinner />
              <div className="mt-2 text-xs">Loading affected deployments</div>
            </div>
          </div>
        ) : deployments.length === 0 ? (
          <EmptyList
            title="No affected app deployments"
            description={
              props.coordinate
                ? `No active app deployments are affected by the breaking change to ${props.coordinate}`
                : 'No active app deployments are affected by the breaking changes in this schema check'
            }
          />
        ) : (
          <DataTable
            data={deployments}
            columns={columns}
            getRowId={deployment => deployment.id}
            pagination={{
              kind: 'cursor',
              hasPreviousPage: endCursors.length > 0,
              hasNextPage,
              onPrevious: () => setEndCursors(cursors => cursors.slice(0, -1)),
              onNext: () => {
                const next = endCursor;
                if (next) {
                  setEndCursors(cursors => [...cursors, next]);
                }
              },
              summary: `Page ${endCursors.length + 1} of ${Math.max(
                1,
                Math.ceil(totalCount / PAGE_SIZE),
              )} · ${totalCount} affected deployments`,
              loading,
            }}
          />
        )}
      </div>
    </>
  );
}

export function TargetChecksAffectedDeploymentsPage(props: {
  schemaCheckId: string;
  coordinate?: string;
}) {
  return (
    <LayoutContent className="min-h-(--min-h-content)">
      <TargetChecksAffectedDeploymentsContent {...props} />
    </LayoutContent>
  );
}
