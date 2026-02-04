import { useEffect, useState } from 'react';
import { LoaderCircleIcon } from 'lucide-react';
import { useClient, useQuery } from 'urql';
import { AppFilter } from '@/components/apps/AppFilter';
import { NotFoundContent } from '@/components/common/not-found-content';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyList } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TimeAgo } from '@/components/v2';
import { graphql } from '@/gql';
import { AppDeploymentStatus } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { cn } from '@/lib/utils';
import { DotsHorizontalIcon } from '@radix-ui/react-icons';
import { Link, useRouter } from '@tanstack/react-router';

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
  const [isLoadingMore, setIsLoadingMore] = useState(false);

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

  const title = data.data?.target?.appDeployment
    ? `${data.data.target.appDeployment.name}@${data.data.target.appDeployment.version}`
    : 'App Deployment';

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

  const appDeployment = data.data?.target?.appDeployment;
  if (!data.fetching && !data.stale && !appDeployment) {
    return (
      <>
        <Meta title="App Version Not found" />
        <NotFoundContent
          heading="App Version not found."
          subheading="This app does not seem to exist anymore."
        />
      </>
    );
  }

  return (
    <>
      <Meta title={title} />
      <div className="flex h-full flex-1 flex-col py-6">
        <SubPageLayoutHeader
          subPageTitle={
            <span className="flex items-center">
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/apps"
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                }}
              >
                App Deployments
              </Link>{' '}
              <span className="text-neutral-10 inline-block px-2 italic">/</span>{' '}
              {appDeployment ? (
                `${appDeployment.name}@${appDeployment.version}`
              ) : (
                <Skeleton className="inline-block h-5 w-[150px]" />
              )}
            </span>
          }
          description={
            <>
              <CardDescription>
                Group your GraphQL operations by app version for app version statistics and
                persisted operations.
              </CardDescription>
              {/* <CardDescription>
                  <DocsLink
                    href="/management/targets#cdn-access-tokens"
                    className="text-neutral-10 hover:text-neutral-11"
                  >
                    Learn more about App Deployments
                  </DocsLink>
                </CardDescription> */}
            </>
          }
        >
          <AppFilter />
        </SubPageLayoutHeader>
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
              className="text-neutral-2 hover:underline"
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
            docsUrl="/features/schema-registry#app-deplyments"
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
                    {appDeployment?.status.toUpperCase() ?? '...'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-xs">Total Documents</div>
                  <div className={cn('text-neutral-12 truncate text-center text-sm font-semibold')}>
                    {appDeployment?.totalDocumentCount ?? '...'}
                  </div>
                </div>
                <div className="min-w-0 text-xs">
                  Created{' '}
                  {appDeployment?.createdAt ? <TimeAgo date={appDeployment.createdAt} /> : '...'}
                </div>
                <div className="min-w-0 text-xs">
                  {data.fetching ? (
                    '...'
                  ) : appDeployment?.lastUsed ? (
                    <>
                      Last Used <TimeAgo date={appDeployment.lastUsed} />
                    </>
                  ) : (
                    'No Usage Data'
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">Document Hash</TableHead>
                    <TableHead className="hidden sm:table-cell">Operation Name</TableHead>
                    <TableHead className="hidden text-end sm:table-cell">
                      Document Content
                    </TableHead>
                    <TableHead className="hidden sm:table-cell" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.data?.target?.appDeployment.documents?.edges.map((edge, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <span className="bg-neutral-5 rounded-sm p-1 font-mono text-sm">
                          {edge.node.hash}
                        </span>
                      </TableCell>
                      <TableCell>
                        {!edge.node.operationName ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help italic">anonymous</span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>The operation within the document has no name.</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="bg-neutral-5 rounded-sm p-1 font-mono text-xs">
                            {edge.node.operationName}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-end">
                        <span className="bg-neutral-5 rounded-sm p-1 font-mono text-xs">
                          {edge.node.body.length > 43
                            ? edge.node.body.substring(0, 43).replace(/\n/g, '\\n') + '...'
                            : edge.node.body}
                        </span>
                      </TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="icon-sm" variant="ghost">
                              <DotsHorizontalIcon />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link
                                to="/$organizationSlug/$projectSlug/$targetSlug/laboratory"
                                params={{
                                  organizationSlug: props.organizationSlug,
                                  projectSlug: props.projectSlug,
                                  targetSlug: props.targetSlug,
                                }}
                                search={{
                                  operationString: edge.node.body,
                                }}
                              >
                                Open in Laboratory
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild className="cursor-pointer">
                              <Link
                                to="/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash"
                                params={{
                                  organizationSlug: props.organizationSlug,
                                  projectSlug: props.projectSlug,
                                  targetSlug: props.targetSlug,
                                  operationName: edge.node.operationName ?? edge.node.hash,
                                  operationHash: edge.node.insightsHash,
                                }}
                              >
                                Show Insights
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div
              className={cn(
                'mt-2',
                data?.data?.target?.appDeployment?.documents?.pageInfo?.hasNextPage === false &&
                  'hidden',
              )}
            >
              <Button
                size="sm"
                variant="outline"
                className="ml-auto mr-0 flex"
                disabled={
                  !data?.data?.target?.appDeployment?.documents?.pageInfo?.hasNextPage ||
                  isLoadingMore
                }
                onClick={() => {
                  if (
                    data?.data?.target?.appDeployment?.documents?.pageInfo?.endCursor &&
                    data?.data?.target?.appDeployment?.documents?.pageInfo?.hasNextPage
                  ) {
                    setIsLoadingMore(true);
                    void client
                      .query(TargetAppsVersionFetchMoreQuery, {
                        organizationSlug: props.organizationSlug,
                        projectSlug: props.projectSlug,
                        targetSlug: props.targetSlug,
                        appName: props.appName,
                        appVersion: props.appVersion,
                        first: 20,
                        after: data?.data?.target?.appDeployment?.documents.pageInfo?.endCursor,
                        documentsFilter: {
                          operationName: debouncedSearch,
                          schemaCoordinates: coordinates ? [coordinates] : null,
                        },
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
      <TargetLayout
        targetSlug={props.targetSlug}
        projectSlug={props.projectSlug}
        organizationSlug={props.organizationSlug}
        page={Page.Apps}
        className="min-h-(--min-h-content)"
      >
        <TargetAppVersionContent {...props} />
      </TargetLayout>
    </>
  );
}
