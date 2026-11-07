import { format } from 'date-fns';
import { useClient, useQuery } from 'urql';
import { AppFilter } from '@/components/apps/app-filter';
import { LayoutContent } from '@/components/layouts/layout-content';
import { BackLink } from '@/components/navigation/back-link';
import { DataTable } from '@/components/ui/data-table/data-table';
import { DataTableCell } from '@/components/ui/data-table/data-table-cell';
import { DateWithTimeAgo } from '@/components/ui/date-with-time-ago';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { NotFound } from '@/components/ui/not-found/not-found';
import { PageLead } from '@/components/ui/page-lead';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { QueryError } from '@/components/ui/query-error';
import { graphql, type DocumentType } from '@/gql';
import { AppDeploymentStatus } from '@/gql/graphql';
import { usePagedConnection, useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import * as shared from '@/styles/shared.css';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { targetAppVersionStyles } from './target-app-version.css';

export const TargetAppsVersionQuery = graphql(`
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

export function appVersionVariables(
  slugs: { organizationSlug: string; projectSlug: string; targetSlug: string },
  appName: string,
  appVersion: string,
  filter: { search: string; coordinates?: string },
) {
  return {
    ...slugs,
    appName,
    appVersion,
    first: 20,
    documentsFilter: {
      operationName: filter.search,
      schemaCoordinates: filter.coordinates ? [filter.coordinates] : null,
    },
  };
}

function TargetAppVersionContent(props: {
  appName: string;
  appVersion: string;
  search: string;
  coordinates?: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const coordinates = props.coordinates ?? null;
  const variables = appVersionVariables(
    { organizationSlug, projectSlug, targetSlug },
    props.appName,
    props.appVersion,
    props,
  );
  const [data] = useQuery({ query: TargetAppsVersionQuery, variables });
  const client = useClient();
  const documents = data.data?.target?.appDeployment?.documents;
  const { rows, pagination } = usePagedConnection({
    edges: documents?.edges.map(edge => edge.node) ?? [],
    pageInfo: documents?.pageInfo ?? { hasNextPage: false },
    pageSize: 20,
    loadMore: after =>
      client.query(TargetAppsVersionFetchMoreQuery, { ...variables, after }).toPromise(),
  });

  // A search change reads the deployment from the cache before its new documents arrive (a
  // partial, stale result); the last settled rows stay up, dimmed, until they do.
  const settled = !!data.data && !data.stale;
  const previousRows = useKeepPreviousData(rows, !settled);
  const refreshing = !settled && !!previousRows?.length;

  const title = `${props.appName}@${props.appVersion}`;

  if (data.error) {
    return (
      <QueryError organizationSlug={organizationSlug} error={data.error} showLogoutButton={false} />
    );
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
                trigger={<span className={targetAppVersionStyles.anonymous}>anonymous</span>}
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
                      organizationSlug,
                      projectSlug,
                      targetSlug,
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
                      organizationSlug,
                      projectSlug,
                      targetSlug,
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
      <div className={targetAppVersionStyles.content}>
        <div>
          <BackLink
            copy="Back to App Deployments"
            link={{
              params: {
                organizationSlug,
                projectSlug,
                targetSlug,
              },
              to: '/$organizationSlug/$projectSlug/$targetSlug/apps',
            }}
          />
          <div className={targetAppVersionStyles.header}>
            <PageLead
              title={title}
              description="Group your GraphQL operations by app version for app version statistics and persisted operations."
              docsLink={{
                href: '/schema-registry/app-deployments',
                text: 'Learn more about App Deployments',
              }}
            />
            <div className={shared.flex}>
              <AppFilter search={props.search} />
            </div>
          </div>
        </div>
        {coordinates ? (
          <div className={targetAppVersionStyles.filterNotice}>
            <span>
              Showing operations affected by{' '}
              <code className={targetAppVersionStyles.filterCode}>{coordinates}</code>
            </span>
            <Link
              to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
              params={{
                organizationSlug,
                projectSlug,
                targetSlug,
                appName: props.appName,
                appVersion: props.appVersion,
              }}
              className={targetAppVersionStyles.filterLink}
            >
              Clear filter
            </Link>
          </div>
        ) : null}
        <div className={targetAppVersionStyles.table} />
        {!settled && !refreshing ? (
          <DataTable loading data={[]} columns={columns} getRowId={document => document.hash} />
        ) : settled && !documents?.edges.length ? (
          <EmptyList
            title={
              coordinates
                ? `No operations found using ${coordinates}`
                : props.search
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
            <div className={targetAppVersionStyles.summary}>
              <div className={targetAppVersionStyles.summaryGrid}>
                <div className={shared.shrinkable}>
                  <div className={shared.text.xs}>Status</div>
                  <div
                    className={targetAppVersionStyles.status({
                      state:
                        appDeployment?.status === AppDeploymentStatus.Retired
                          ? 'retired'
                          : appDeployment?.status === AppDeploymentStatus.Pending
                            ? 'pending'
                            : undefined,
                    })}
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
                <div className={shared.shrinkable}>
                  <div className={shared.text.xs}>Total Documents</div>
                  <div className={targetAppVersionStyles.valueCentered}>
                    {appDeployment?.totalDocumentCount ?? '...'}
                  </div>
                </div>
                <div className={shared.shrinkable}>
                  <div className={shared.text.xs}>Created</div>
                  <div className={targetAppVersionStyles.value}>
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
                <div className={shared.shrinkable}>
                  <div className={shared.text.xs}>Activated</div>
                  <div className={targetAppVersionStyles.value}>
                    {appDeployment?.activatedAt ? (
                      <DateWithTimeAgo
                        date={appDeployment.activatedAt}
                        dateFormatStr="MMM d, yyyy HH:mm:ss"
                      />
                    ) : (
                      <span className={targetAppVersionStyles.valueMuted}>—</span>
                    )}
                  </div>
                </div>
                <div className={shared.shrinkable}>
                  <div className={shared.text.xs}>Last Used</div>
                  <div className={targetAppVersionStyles.value}>
                    {data.fetching ? (
                      '...'
                    ) : appDeployment?.lastUsed ? (
                      <DateWithTimeAgo
                        date={appDeployment.lastUsed}
                        dateFormatStr="MMM d, yyyy HH:mm:ss"
                      />
                    ) : (
                      <span className={targetAppVersionStyles.valueMuted}>No Usage Data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <DataTable
              data={refreshing ? previousRows! : rows}
              refreshing={refreshing}
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
  appName: string;
  appVersion: string;
  search: string;
  coordinates?: string;
}) {
  return (
    <>
      <LayoutContent className={targetAppVersionStyles.page}>
        <TargetAppVersionContent {...props} />
      </LayoutContent>
    </>
  );
}
