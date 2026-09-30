import { format } from 'date-fns';
import { useClient, useQuery } from 'urql';
import { z } from 'zod';
import { LayoutContent } from '@/components/layouts/layout-content';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { EmptyList, NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { PageLead } from '@/components/ui/page-lead';
import { QueryError } from '@/components/ui/query-error';
import { graphql, useFragment, type DocumentType } from '@/gql';
import { AppDeploymentsSortField, SortDirectionType } from '@/gql/graphql';
import { usePagedConnection, useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { getRouteApi } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

const appsRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/apps',
);

export const TargetAppsSortSchema = z.object({
  field: z.enum(['CREATED_AT', 'ACTIVATED_AT', 'LAST_USED']),
  direction: z.enum(['ASC', 'DESC']),
});

export type SortState = z.output<typeof TargetAppsSortSchema>;

export const defaultAppsSort: SortState = { field: 'ACTIVATED_AT', direction: 'DESC' };

export function appsVariables(
  slugs: { organizationSlug: string; projectSlug: string; targetSlug: string },
  sorting: SortState,
) {
  return {
    ...slugs,
    sort: {
      field: sorting.field as AppDeploymentsSortField,
      direction: sorting.direction as SortDirectionType,
    },
  };
}

const AppTableRow_AppDeploymentFragment = graphql(`
  fragment AppTableRow_AppDeploymentFragment on AppDeployment {
    id
    name
    version
    status
    totalDocumentCount
    createdAt
    activatedAt
    retiredAt
    lastUsed
  }
`);

export const TargetAppsViewQuery = graphql(`
  query TargetAppsViewQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $after: String
    $sort: AppDeploymentsSortInput
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
      latestSchemaVersion {
        id
        __typename
      }
      project {
        id
        type
      }
      appDeployments(first: 20, after: $after, sort: $sort) {
        total
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            ...AppTableRow_AppDeploymentFragment
          }
        }
      }
    }
  }
`);

const TargetAppsViewFetchMoreQuery = graphql(`
  query TargetAppsViewFetchMoreQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $after: String!
    $sort: AppDeploymentsSortInput
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
      appDeployments(first: 20, after: $after, sort: $sort) {
        total
        pageInfo {
          hasNextPage
          endCursor
        }
        edges {
          node {
            id
            ...AppTableRow_AppDeploymentFragment
          }
        }
      }
    }
  }
`);

type AppDeploymentRow = DocumentType<typeof AppTableRow_AppDeploymentFragment>;

function TargetAppsView(props: { sorting: SortState }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const navigate = appsRoute.useNavigate();
  const variables = appsVariables({ organizationSlug, projectSlug, targetSlug }, props.sorting);

  const [data] = useQuery({ query: TargetAppsViewQuery, variables });
  const client = useClient();
  const connection = data.data?.target?.appDeployments;
  const deployments = useFragment(
    AppTableRow_AppDeploymentFragment,
    connection?.edges.map(edge => edge.node) ?? [],
  );
  const { rows, pagination } = usePagedConnection({
    edges: deployments,
    pageInfo: connection?.pageInfo ?? { hasNextPage: false },
    pageSize: 20,
    total: connection?.total,
    loadMore: after =>
      client.query(TargetAppsViewFetchMoreQuery, { ...variables, after }).toPromise(),
  });
  const sortingState = [{ id: props.sorting.field, desc: props.sorting.direction === 'DESC' }];
  // A sort change reads the target from the cache before its new list arrives (a partial, stale
  // result), so only a settled result decides between the empty states and the table; until then
  // the last settled rows stay up, dimmed.
  const settled = !!data.data && !data.stale;
  const previousRows = useKeepPreviousData(rows, !settled);
  const refreshing = !settled && !!previousRows?.length;

  if (data.error) {
    return (
      <QueryError organizationSlug={organizationSlug} error={data.error} showLogoutButton={false} />
    );
  }

  const columns: ColumnDef<AppDeploymentRow, unknown>[] = [
    {
      id: 'name',
      header: 'App@Version',
      meta: { width: 'fill' },
      cell: ({ row }) => (
        <DataTableCell
          kind="link"
          label={`${row.original.name}@${row.original.version}`}
          mono
          link={{
            to: '/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion',
            params: {
              organizationSlug,
              projectSlug,
              targetSlug,
              appName: row.original.name,
              appVersion: row.original.version,
            },
          }}
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center', hideBelow: 'sm' },
      cell: ({ row }) => (
        <DataTableCell
          kind="badge"
          items={{
            content:
              row.original.status === 'retired' && row.original.retiredAt
                ? `${row.original.status} (${format(row.original.retiredAt, 'MMM d, yyyy HH:mm:ss')})`
                : row.original.status,
            variant: 'secondary',
          }}
        />
      ),
    },
    {
      id: 'documents',
      header: 'Documents',
      meta: { align: 'right', width: 'xs' },
      cell: ({ row }) => <DataTableCell kind="number" value={row.original.totalDocumentCount} />,
    },
    {
      id: 'CREATED_AT',
      header: 'Created',
      meta: { sortable: true, hideBelow: 'sm' },
      cell: ({ row }) => (
        <DataTableCell kind="time" date={row.original.createdAt} mode="relative-info" />
      ),
    },
    {
      id: 'ACTIVATED_AT',
      header: 'Activated',
      meta: { sortable: true, hideBelow: 'sm' },
      cell: ({ row }) =>
        row.original.activatedAt ? (
          <DataTableCell kind="time" date={row.original.activatedAt} mode="relative-info" />
        ) : (
          <DataTableCell kind="placeholder" />
        ),
    },
    {
      id: 'LAST_USED',
      header: 'Last used',
      meta: {
        sortable: true,
        align: 'right',
        tooltip:
          'Last time a request was sent for this app. Requires usage reporting being set up.',
      },
      cell: ({ row }) =>
        row.original.lastUsed ? (
          <DataTableCell kind="time" date={row.original.lastUsed} mode="relative-info" />
        ) : (
          <DataTableCell kind="placeholder" />
        ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col py-6">
      <PageLead
        title="App Deployments"
        description="Group your GraphQL operations by app version for app version statistics and persisted operations."
        docsLink={{
          href: '/schema-registry/app-deployments',
          text: 'Learn more about App Deployments',
        }}
      />
      <div className="mt-4" />
      {settled && !data.data?.target?.latestSchemaVersion ? (
        <NoSchemaVersion
          recommendedAction="publish"
          projectType={data.data?.target?.project?.type ?? null}
        />
      ) : settled && !connection?.edges.length ? (
        <EmptyList
          title="Hive is waiting for your first app deployment"
          description="You can create an app deployment with the Hive CLI"
          docsUrl="/schema-registry/app-deployments"
        />
      ) : (
        <DataTable
          loading={!settled && !refreshing}
          data={refreshing ? previousRows! : rows}
          columns={columns}
          getRowId={deployment => deployment.id}
          sorting={{
            state: sortingState,
            manual: true,
            loading: refreshing,
            onChange: updater => {
              const [next] = typeof updater === 'function' ? updater(sortingState) : updater;
              if (!next) {
                return;
              }
              void navigate({
                search: (prev: Record<string, unknown>) => ({
                  ...prev,
                  sort: {
                    field: next.id as SortState['field'],
                    direction: next.desc ? 'DESC' : 'ASC',
                  },
                }),
              });
            },
          }}
          pagination={{
            ...pagination,
            summary: connection
              ? `${pagination.summary} · ${connection.total} deployments`
              : pagination.summary,
          }}
        />
      )}
    </div>
  );
}

export function TargetAppsPage(props: { sorting: SortState }) {
  return (
    <>
      <Meta title="App Deployments" />
      <LayoutContent>
        <TargetAppsView sorting={props.sorting} />
      </LayoutContent>
    </>
  );
}
