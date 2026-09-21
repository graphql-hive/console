import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useClient, useQuery } from 'urql';
import { AppFilter } from '@/components/apps/AppFilter';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { NotFound } from '@/components/base/not-found/not-found';
import { PageLead } from '@/components/base/page-lead';
import { LayoutContent } from '@/components/layouts/layout-content';
import { BackLink } from '@/components/navigation/back-link';
import { DateWithTimeAgo } from '@/components/ui/date-with-time-ago';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { graphql, type DocumentType } from '@/gql';
import { AppDeploymentStatus } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { usePagedConnection } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Link, useRouter } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';

const TargetAppsVersionQuery = graphql(`
  query TargetAppsVersionQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $appName: String!
    $appVersion: String!
    $first: Int
    $documentsFilter: AppDeploymentDocumentsFilterInput
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
      viewerCanViewAppDeployments
      appDeployment(appName: $appName, appVersion: $appVersion) {
        id
        name
        version
        createdAt
        activatedAt
        retiredAt
        lastUsed
        totalDocumentCount
        status
        documents(first: $first, filter: $documentsFilter) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              hash
              body
              operationName
              insightsHash
            }
          }
        }
      }
    }
  }
`);

const TargetAppsVersionFetchMoreQuery = graphql(`
  query TargetAppsVersionFetchMore(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $appName: String!
    $appVersion: String!
    $first: Int
    $after: String
    $documentsFilter: AppDeploymentDocumentsFilterInput
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
      appDeployment(appName: $appName, appVersion: $appVersion) {
        id
        documents(first: $first, after: $after, filter: $documentsFilter) {
          pageInfo {
            hasNextPage
            endCursor
          }
          edges {
            node {
              hash
              body
              operationName
              insightsHash
            }
          }
        }
      }
    }
  }
`);

type AppDocument = NonNullable<
  NonNullable<
    NonNullable<DocumentType<typeof TargetAppsVersionQuery>['target']>['appDeployment']
  >['documents']
>['edges'][number]['node'];

function TargetAppVersionContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  appName: string;
  appVersion: string;
  coordinates?: string;
}) {
  const router = useRouter();
  const search =
    typeof router.latestLocation.search.search === 'string'
      ? router.latestLocation.search.search
      : '';
  const coordinates = props.coordinates ?? null;
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [search]);
  const [data] = useQuery({
    query: TargetAppsVersionQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      appName: props.appName,
      appVersion: props.appVersion,
      first: 20,
      documentsFilter: {
        operationName: debouncedSearch,
        schemaCoordinates: coordinates ? [coordinates] : null,
      },
    },
  });
  const client = useClient();
  const documents = data.data?.target?.appDeployment?.documents;
  const { rows, pagination } = usePagedConnection({
    edges: documents?.edges.map(edge => edge.node) ?? [],
    pageInfo: documents?.pageInfo ?? { hasNextPage: false },
    pageSize: 20,
    loadMore: after =>
      client
        .query(TargetAppsVersionFetchMoreQuery, {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
          appName: props.appName,
          appVersion: props.appVersion,
          first: 20,
          after,
          documentsFilter: {
            operationName: debouncedSearch,
            schemaCoordinates: coordinates ? [coordinates] : null,
          },
        })
        .toPromise(),
  });

  const project = data.data?.target;

  useRedirect({
    entity: project,
    canAccess: project?.viewerCanViewAppDeployments === true,
    redirectTo(router) {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
        replace: true,
      });
    },
  });

  const title = `${props.appName}@${props.appVersion}`;

  if (data.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={data.error}
        showLogoutButton={false}
      />
    );
  }

  if (project?.viewerCanViewAppDeployments === false) {
    return null;
  }

  const columns: ColumnDef<AppDocument, unknown>[] = [
    {
      id: 'hash',
      header: 'Document Hash',
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.hash} mono />,
    },
    {
      id: 'operationName',
      header: 'Operation Name',
      cell: ({ row }) =>
        row.original.operationName ? (
          <DataTableCell kind="text" value={row.original.operationName} mono />
        ) : (
          <DataTableCell
            kind="text"
            tone="muted"
            value={
              <Tooltip
                trigger={<span className="cursor-help italic">anonymous</span>}
                content="The operation within the document has no name."
              />
            }
          />
        ),
    },
    {
      id: 'body',
      header: 'Document Content',
      meta: { width: 'fill', align: 'right' },
      cell: ({ row }) => (
        <DataTableCell
          kind="text"
          mono
          value={
            row.original.body.length > 43
              ? row.original.body.substring(0, 43).replace(/\n/g, '\\n') + '...'
              : row.original.body
          }
        />
      ),
    },
    {
      id: 'actions',
      meta: { width: 'xs' },
      cell: ({ row }) => (
        <DataTableCell
          kind="actions"
          label={`Actions for ${row.original.operationName ?? row.original.hash}`}
          sections={[
            [
              {
                label: 'Open in Laboratory',
                render: (
                  <Link
                    to="/$organizationSlug/$projectSlug/$targetSlug/laboratory"
                    params={{
                      organizationSlug: props.organizationSlug,
                      projectSlug: props.projectSlug,
                      targetSlug: props.targetSlug,
                    }}
                    search={{ operationString: row.original.body }}
                  />
                ),
              },
              {
                label: 'Show Insights',
                render: (
                  <Link
                    to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                    params={{
                      organizationSlug: props.organizationSlug,
                      projectSlug: props.projectSlug,
                      targetSlug: props.targetSlug,
                      operationName: row.original.operationName ?? row.original.hash,
                      operationHash: row.original.insightsHash,
                    }}
                  />
                ),
              },
            ],
          ]}
        />
      ),
    },
  ];

  const appDeployment = data.data?.target?.appDeployment;
  if (!data.fetching && !data.stale && !appDeployment) {
    return (
      <>
        <Meta title="App Version Not found" />
        <NotFound
          title="App Version not found."
          description="This app does not seem to exist anymore."
        />
      </>
    );
  }

  return (
    <>
      <Meta title={title} />
      <div className="flex h-full flex-1 flex-col py-6">
        <div>
          <BackLink
            copy="Back to App Deployments"
            link={{
              params: {
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
              },
              to: '/$organizationSlug/$projectSlug/$targetSlug/apps',
            }}
          />
          <div className="flex items-start justify-between gap-4">
            <PageLead
              title={title}
              description="Group your GraphQL operations by app version for app version statistics and persisted operations."
              docsLink={{
                href: '/schema-registry/app-deployments',
                text: 'Learn more about App Deployments',
              }}
            />
            <div className="flex">
              <AppFilter />
            </div>
          </div>
        </div>
        {coordinates ? (
          <div className="mt-4 flex items-center justify-between rounded-md border border-orange-500/50 bg-orange-500/10 px-4 py-2 text-sm">
            <span>
              Showing operations affected by{' '}
              <code className="bg-neutral-5 rounded-sm px-1 py-0.5 font-mono text-orange-400">
                {coordinates}
              </code>
            </span>
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
              params={{
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                appName: props.appName,
                appVersion: props.appVersion,
              }}
              className="text-orange-500 hover:underline"
            >
              Clear filter
            </Link>
          </div>
        ) : null}
        <div className="mt-4" />
        {data.fetching || data.stale ? (
          <div className="flex h-fit flex-1 items-center justify-center">
            <div className="flex flex-col items-center">
              <Spinner />
              <div className="mt-2 text-xs">Loading app deployments</div>
            </div>
          </div>
        ) : !data.data?.target?.appDeployment?.documents?.edges.length ? (
          <EmptyList
            title={
              coordinates
                ? `No operations found using ${coordinates}`
                : debouncedSearch
                  ? 'No documents found matching that operation name'
                  : 'No documents have been uploaded for this app deployment'
            }
            description={
              coordinates
                ? 'No operations in this deployment use this schema coordinate'
                : 'You can upload documents via the Hive CLI'
            }
            docsUrl="/schema-registry/app-deployments"
          />
        ) : (
          <>
            <div className="mb-3">
              <div className="border-neutral-5 text-neutral-10 grid grid-flow-col grid-rows-2 items-center justify-between gap-4 rounded-md border px-4 py-3 font-medium md:grid-rows-1">
                <div className="min-w-0">
                  <div className="text-xs">Status</div>
                  <div
                    className={cn(
                      'text-neutral-12 truncate text-sm font-semibold',
                      appDeployment?.status === AppDeploymentStatus.Retired && 'text-red-600',
                      appDeployment?.status === AppDeploymentStatus.Pending && 'text-neutral-11',
                    )}
                  >
                    {appDeployment?.status === AppDeploymentStatus.Retired &&
                    appDeployment?.retiredAt ? (
                      <span>
                        RETIRED ({format(appDeployment.retiredAt, 'MMM d, yyyy HH:mm:ss')})
                      </span>
                    ) : (
                      (appDeployment?.status.toUpperCase() ?? '...')
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs">Total Documents</div>
                  <div className={cn('text-neutral-12 truncate text-center text-sm font-semibold')}>
                    {appDeployment?.totalDocumentCount ?? '...'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs">Created</div>
                  <div className="text-neutral-12 text-sm font-semibold">
                    {appDeployment?.createdAt ? (
                      <DateWithTimeAgo
                        date={appDeployment.createdAt}
                        dateFormatStr="MMM d, yyyy HH:mm:ss"
                      />
                    ) : (
                      '...'
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs">Activated</div>
                  <div className="text-neutral-12 text-sm font-semibold">
                    {appDeployment?.activatedAt ? (
                      <DateWithTimeAgo
                        date={appDeployment.activatedAt}
                        dateFormatStr="MMM d, yyyy HH:mm:ss"
                      />
                    ) : (
                      <span className="text-neutral-10 font-normal">—</span>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs">Last Used</div>
                  <div className="text-neutral-12 text-sm font-semibold">
                    {data.fetching ? (
                      '...'
                    ) : appDeployment?.lastUsed ? (
                      <DateWithTimeAgo
                        date={appDeployment.lastUsed}
                        dateFormatStr="MMM d, yyyy HH:mm:ss"
                      />
                    ) : (
                      <span className="text-neutral-10 font-normal">No Usage Data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DataTable
              data={rows}
              columns={columns}
              getRowId={document => document.hash}
              pagination={pagination}
            />
          </>
        )}
      </div>
    </>
  );
}

export function TargetAppVersionPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  appName: string;
  appVersion: string;
  coordinates?: string;
}) {
  return (
    <>
      <LayoutContent className="min-h-(--min-h-content)">
        <TargetAppVersionContent {...props} />
      </LayoutContent>
    </>
  );
}
