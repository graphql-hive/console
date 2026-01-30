import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Button } from '@/components/ui/button';
import { EmptyList } from '@/components/ui/empty-list';
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
import { graphql } from '@/gql';
import { Link } from '@tanstack/react-router';

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
};

const PAGE_SIZE = 20;

function TargetChecksAffectedDeploymentsContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  schemaCheckId: string;
  coordinate?: string;
}) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [accumulatedDeployments, setAccumulatedDeployments] = useState<AffectedDeployment[]>([]);
  const [storedTotalCount, setStoredTotalCount] = useState<number | null>(null);
  const hasLoadedOnce = useRef(false);

  const [data] = useQuery({
    query: AffectedDeploymentsQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      schemaCheckId: props.schemaCheckId,
      first: PAGE_SIZE,
      after: cursor,
    },
  });

  if (data.data && !data.fetching && !data.stale) {
    hasLoadedOnce.current = true;
  }

  const { currentPageDeployments, hasNextPage, endCursor, responseTotalCount } = useMemo(() => {
    const schemaCheck = data.data?.target?.schemaCheck;
    if (!schemaCheck)
      return {
        currentPageDeployments: [],
        hasNextPage: false,
        endCursor: null,
        responseTotalCount: 0,
      };

    const breakingChanges =
      'breakingSchemaChanges' in schemaCheck ? schemaCheck.breakingSchemaChanges : null;

    if (!breakingChanges?.edges)
      return {
        currentPageDeployments: [],
        hasNextPage: false,
        endCursor: null,
        responseTotalCount: 0,
      };

    for (const edge of breakingChanges.edges) {
      const change = edge.node;
      const coordinate = change.path?.join('.') ?? 'unknown';

      if (coordinate === props.coordinate && change.affectedAppDeployments) {
        const deployments =
          change.affectedAppDeployments.edges?.map(
            (edge): AffectedDeployment => ({
              id: edge.node.id,
              name: edge.node.name,
              version: edge.node.version,
              totalOperations: edge.node.totalAffectedOperations,
            }),
          ) ?? [];

        return {
          currentPageDeployments: deployments,
          hasNextPage: change.affectedAppDeployments.pageInfo.hasNextPage,
          endCursor: change.affectedAppDeployments.pageInfo.endCursor,
          responseTotalCount: change.affectedAppDeployments.totalCount,
        };
      }
    }

    return {
      currentPageDeployments: [],
      hasNextPage: false,
      endCursor: null,
      responseTotalCount: 0,
    };
  }, [data.data?.target?.schemaCheck, props.coordinate]);

  if (storedTotalCount === null && responseTotalCount > 0) {
    setStoredTotalCount(responseTotalCount);
  }

  const totalCount = storedTotalCount ?? responseTotalCount;

  const allDeployments = useMemo(() => {
    const seenIds = new Set(accumulatedDeployments.map(d => d.id));
    const newDeployments = currentPageDeployments.filter(d => !seenIds.has(d.id));
    return [...accumulatedDeployments, ...newDeployments];
  }, [accumulatedDeployments, currentPageDeployments]);

  const handleLoadMore = useCallback(() => {
    if (endCursor && hasNextPage) {
      setAccumulatedDeployments(allDeployments);
      setCursor(endCursor);
    }
  }, [endCursor, hasNextPage, allDeployments]);

  if (data.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={data.error}
        showLogoutButton={false}
      />
    );
  }

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
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                  schemaCheckId: props.schemaCheckId,
                }}
                className="text-neutral-2 hover:underline"
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
        {!hasLoadedOnce.current && allDeployments.length === 0 ? (
          <div className="flex h-fit flex-1 items-center justify-center">
            <div className="flex flex-col items-center">
              <Spinner />
              <div className="mt-2 text-xs">Loading affected deployments</div>
            </div>
          </div>
        ) : allDeployments.length === 0 ? (
          <EmptyList
            title="No affected app deployments"
            description={
              props.coordinate
                ? `No active app deployments are affected by the breaking change to ${props.coordinate}`
                : 'No active app deployments are affected by the breaking changes in this schema check'
            }
          />
        ) : (
          <div className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">App Name</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="text-right">Total Operations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allDeployments.map(deployment => (
                    <TableRow key={deployment.id}>
                      <TableCell className="font-medium">
                        <Link
                          to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
                          params={{
                            organizationSlug: props.organizationSlug,
                            projectSlug: props.projectSlug,
                            targetSlug: props.targetSlug,
                            appName: deployment.name,
                            appVersion: deployment.version,
                          }}
                          search={{
                            coordinates: props.coordinate,
                          }}
                          className="text-neutral-2 hover:underline"
                        >
                          {deployment.name}
                        </Link>
                      </TableCell>
                      <TableCell>{deployment.version}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="link" className="text-neutral-2 h-auto p-0" asChild>
                          <Link
                            to="/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion"
                            params={{
                              organizationSlug: props.organizationSlug,
                              projectSlug: props.projectSlug,
                              targetSlug: props.targetSlug,
                              appName: deployment.name,
                              appVersion: deployment.version,
                            }}
                            search={{
                              coordinates: props.coordinate,
                            }}
                          >
                            {deployment.totalOperations}{' '}
                            {deployment.totalOperations === 1 ? 'operation' : 'operations'}
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="text-neutral-10 flex items-center justify-between text-sm">
              <span>
                Showing {allDeployments.length} of {totalCount} affected deployments
              </span>
              {hasNextPage && (
                <Button variant="outline" onClick={handleLoadMore} disabled={data.fetching}>
                  {data.fetching ? (
                    <>
                      <Spinner className="mr-2 size-4" />
                      Loading...
                    </>
                  ) : (
                    'Load more'
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function TargetChecksAffectedDeploymentsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  schemaCheckId: string;
  coordinate?: string;
}) {
  return (
    <TargetLayout
      targetSlug={props.targetSlug}
      projectSlug={props.projectSlug}
      organizationSlug={props.organizationSlug}
      page={Page.Checks}
      className="min-h-(--min-h-content)"
    >
      <TargetChecksAffectedDeploymentsContent {...props} />
    </TargetLayout>
  );
}
