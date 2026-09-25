import { format } from 'date-fns';
import { useClient, useQuery } from 'urql';
import { z } from 'zod';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { PageLead } from '@/components/base/page-lead';
import { LayoutContent } from '@/components/layouts/layout-content';
import { EmptyList, NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { graphql, useFragment, type DocumentType } from '@/gql';
import { AppDeploymentsSortField, SortDirectionType } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { usePagedConnection, useSlugs } from '@/lib/hooks';
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

const TargetAppsViewQuery = graphql(`
  query TargetAppsViewQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $after: String
    $sort: AppDeploymentsSortInput
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
    }
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
      viewerCanViewAppDeployments
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
  const sortVariable = {
    field: props.sorting.field as AppDeploymentsSortField,
    direction: props.sorting.direction as SortDirectionType,
  };

  const [data] = useQuery({
    query: TargetAppsViewQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      sort: sortVariable,
    },
  });
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
      client
        .query(TargetAppsViewFetchMoreQuery, {
          organizationSlug,
          projectSlug,
          targetSlug,
          after,
          sort: sortVariable,
        })
        .toPromise(),
  });
  const sortingState = [{ id: props.sorting.field, desc: props.sorting.direction === 'DESC' }];

  const project = data.data?.target;

  useRedirect({
    entity: project,
    canAccess: project?.viewerCanViewAppDeployments === true,
    redirectTo(router) {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params: {
          organizationSlug,
          projectSlug,
          targetSlug,
        },
        replace: true,
      });
    },
  });

  if (data.error) {
    return (
      <QueryError organizationSlug={organizationSlug} error={data.error} showLogoutButton={false} />
    );
  }

  if (project?.viewerCanViewAppDeployments === false) {
    return null;
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
      {data.fetching || data.stale ? (
        <div className="flex h-fit flex-1 items-center justify-center">
          <div className="flex flex-col items-center">
            <Spinner />
            <div className="mt-2 text-xs">Loading app deployments</div>
          </div>
        </div>
      ) : !data.data?.target?.latestSchemaVersion ? (
        <NoSchemaVersion
          recommendedAction="publish"
          projectType={data.data?.target?.project?.type ?? null}
        />
      ) : !connection?.edges.length ? (
        <EmptyList
          title="Hive is waiting for your first app deployment"
          description="You can create an app deployment with the Hive CLI"
          docsUrl="/schema-registry/app-deployments"
        />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowId={deployment => deployment.id}
          sorting={{
            state: sortingState,
            manual: true,
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
            summary: `${pagination.summary} · ${connection.total} deployments`,
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
