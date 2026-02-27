import { useState } from 'react';
import { format } from 'date-fns';
import { LoaderCircleIcon } from 'lucide-react';
import { useClient, useQuery } from 'urql';
import { z } from 'zod';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { DateWithTimeAgo } from '@/components/ui/date-with-time-ago';
import { DeploymentStatusLabel } from '@/components/ui/deployment-status';
import { EmptyList, NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Sortable, TimeAgo } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { AppDeploymentsSortField, SortDirectionType } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { Link, useNavigate } from '@tanstack/react-router';

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

function AppTableRow(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  appDeployment: FragmentType<typeof AppTableRow_AppDeploymentFragment>;
}) {
  const appDeployment = useFragment(AppTableRow_AppDeploymentFragment, props.appDeployment);

  return (
    <TableRow>
      <TableCell>
        <Link
          className="font-mono text-xs font-bold"
          to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
          params={{
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
            appName: appDeployment.name,
            appVersion: appDeployment.version,
          }}
        >
          {appDeployment.name}@{appDeployment.version}
        </Link>
      </TableCell>
      <TableCell className="hidden text-center sm:table-cell">
        <Badge className="text-xs" variant="secondary">
          <DeploymentStatusLabel
            status={appDeployment.status}
            retiredAt={appDeployment.retiredAt}
          />
        </Badge>
      </TableCell>
      <TableCell className="text-center">{appDeployment.totalDocumentCount}</TableCell>
      <TableCell className="hidden text-center sm:table-cell">
        <span className="text-xs">
          <DateWithTimeAgo date={appDeployment.createdAt} />
        </span>
      </TableCell>
      <TableCell className="hidden text-center sm:table-cell">
        {appDeployment.activatedAt ? (
          <span className="text-xs">
            <DateWithTimeAgo date={appDeployment.activatedAt} />
          </span>
        ) : (
          <span className="text-neutral-10 text-xs">—</span>
        )}
      </TableCell>
      <TableCell className="text-end">
        {appDeployment.lastUsed ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge className="cursor-help text-xs" variant="outline">
                  <TimeAgo date={appDeployment.lastUsed} />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>{format(appDeployment.lastUsed, 'MMM d, yyyy HH:mm:ss')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge className="cursor-help text-xs" variant="outline">
                  No data
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>There was no usage reported yet.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </TableCell>
    </TableRow>
  );
}

function TargetAppsView(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  sorting: SortState;
}) {
  const navigate = useNavigate();
  const sortVariable = {
    field: props.sorting.field as AppDeploymentsSortField,
    direction: props.sorting.direction as SortDirectionType,
  };

  const [data] = useQuery({
    query: TargetAppsViewQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      sort: sortVariable,
    },
  });
  const client = useClient();
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  function handleSortClick(field: SortState['field']) {
    const newDirection =
      props.sorting.field === field && props.sorting.direction === 'DESC' ? 'ASC' : 'DESC';
    void navigate({
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        sort: { field, direction: newDirection },
      }),
    });
  }

  function getSortOrder(field: SortState['field']): 'asc' | 'desc' | false {
    if (props.sorting.field !== field) return false;
    return props.sorting.direction === 'ASC' ? 'asc' : 'desc';
  }

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

  return (
    <div className="flex flex-1 flex-col py-6">
      <SubPageLayoutHeader
        subPageTitle="App Deployments"
        description={
          <>
            <CardDescription>
              Group your GraphQL operations by app version for app version statistics and persisted
              operations.
            </CardDescription>
            {/* <CardDescription>
              <DocsLink
                 href="/management/app-deployments"
                className="text-neutral-10 hover:text-neutral-11"
              >
                Learn more about App Deployments
              </DocsLink>
            </CardDescription> */}
          </>
        }
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
      ) : !data.data.target.appDeployments?.edges?.length ? (
        <EmptyList
          title="Hive is waiting for your first app deployment"
          description="You can create an app deployment with the Hive CLI"
          docsUrl="/features/schema-registry#app-deplyments"
        />
      ) : (
        <div>
          <div className="rounded-md border">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  <TableHead className="hidden w-[30%] sm:table-cell">App@Version</TableHead>
                  <TableHead className="hidden w-[15%] text-center sm:table-cell">Status</TableHead>
                  <TableHead className="hidden w-[5%] text-center sm:table-cell">
                    Documents
                  </TableHead>
                  <TableHead className="hidden w-[10%] text-center sm:table-cell">
                    <Sortable
                      sortOrder={getSortOrder('CREATED_AT')}
                      onClick={() => handleSortClick('CREATED_AT')}
                    >
                      Created
                    </Sortable>
                  </TableHead>
                  <TableHead className="hidden w-[10%] text-center sm:table-cell">
                    <Sortable
                      sortOrder={getSortOrder('ACTIVATED_AT')}
                      onClick={() => handleSortClick('ACTIVATED_AT')}
                    >
                      Activated
                    </Sortable>
                  </TableHead>
                  <TableHead className="hidden w-[7%] text-end sm:table-cell">
                    <Sortable
                      sortOrder={getSortOrder('LAST_USED')}
                      onClick={() => handleSortClick('LAST_USED')}
                    >
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">Last used</TooltipTrigger>
                          <TooltipContent className="max-w-64 text-start">
                            Last time a request was sent for this app. Requires usage reporting
                            being set up.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Sortable>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data?.target?.appDeployments?.edges.map((edge, i) => (
                  <AppTableRow
                    key={i}
                    organizationSlug={props.organizationSlug}
                    projectSlug={props.projectSlug}
                    targetSlug={props.targetSlug}
                    appDeployment={edge.node}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs">
              Showing {data.data?.target?.appDeployments?.edges.length ?? 0} of{' '}
              {data.data?.target?.appDeployments?.total ?? 0} deployments
            </span>
            <Button
              size="sm"
              variant="outline"
              className="flex"
              disabled={!data?.data?.target?.appDeployments?.pageInfo?.hasNextPage || isLoadingMore}
              onClick={() => {
                if (
                  data?.data?.target?.appDeployments?.pageInfo?.endCursor &&
                  data?.data?.target?.appDeployments?.pageInfo?.hasNextPage
                ) {
                  setIsLoadingMore(true);
                  void client
                    .query(TargetAppsViewFetchMoreQuery, {
                      organizationSlug: props.organizationSlug,
                      projectSlug: props.projectSlug,
                      targetSlug: props.targetSlug,
                      after: data?.data?.target?.appDeployments?.pageInfo?.endCursor,
                      sort: sortVariable,
                    })
                    .toPromise()
                    .finally(() => {
                      setIsLoadingMore(false);
                    });
                }
              }}
            >
              {isLoadingMore ? (
                <>
                  <LoaderCircleIcon className="mr-2 inline size-4 animate-spin" /> Loading
                </>
              ) : (
                'Load more'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function TargetAppsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  sorting: SortState;
}) {
  return (
    <>
      <Meta title="App Deployments" />
      <TargetLayout
        targetSlug={props.targetSlug}
        projectSlug={props.projectSlug}
        organizationSlug={props.organizationSlug}
        page={Page.Apps}
      >
        <TargetAppsView
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
          sorting={props.sorting}
        />
      </TargetLayout>
    </>
  );
}
