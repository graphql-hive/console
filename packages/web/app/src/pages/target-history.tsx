import { ReactElement, useState } from 'react';
import { FileSymlinkIcon, GitCommitVerticalIcon, PackageIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { StatusDot } from '@/components/base/status-dot/status-dot';
import { LayoutContent } from '@/components/layouts/layout-content';
import { NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { Link, Outlet, useParams } from '@tanstack/react-router';

const HistoryPage_VersionsPageQuery = graphql(`
  query HistoryPage_VersionsPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $first: Int!
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
      schemaVersions(first: $first, after: $after) {
        edges {
          node {
            id
            date
            isValid
            meta {
              author
              commit
            }
            origin {
              __typename
              ... on SchemaVersionPromoteOrigin {
                schemaVersionId
                targetId
                targetSlug
              }
              ... on SchemaVersionPublishOrigin {
                revision
                publishedSubgraphs {
                  name
                  versionId
                  revision
                }
              }
              ... on SchemaVersionSubgraphRemoveOrigin {
                removedSubgraphs {
                  name
                  versionId
                }
              }
            }
            githubMetadata {
              repository
              commit
            }
          }
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      }
    }
  }
`);

// URQL's Infinite scrolling pattern
// https://formidable.com/open-source/urql/docs/basics/ui-patterns/#infinite-scrolling
function ListPage(props: {
  variables: { after: string | null; first: number };
  isLastPage: boolean;
  onLoadMore: (after: string) => void;
  versionId?: string;
}): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { variables, isLastPage, onLoadMore, versionId } = props;
  const [versionsQuery] = useQuery({
    query: HistoryPage_VersionsPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      ...variables,
    },
    requestPolicy: 'cache-and-network',
  });

  const edges = versionsQuery.data?.target?.schemaVersions.edges;
  const hasMore = versionsQuery.data?.target?.schemaVersions?.pageInfo?.hasNextPage ?? false;

  return (
    <>
      {edges?.map(({ node: version }) => (
        <Link
          key={version.id}
          className={cn(
            'flex items-stretch gap-3 rounded-lg py-3 pl-2 pr-3',
            'hover:bg-surface-hover',
            versionId === version.id && 'bg-surface-selected',
          )}
          to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
          params={{
            organizationSlug,
            projectSlug,
            targetSlug,
            versionId: version.id,
          }}
        >
          <div className="mt-0.5 flex">
            <StatusDot
              color={version.isValid ? 'success' : 'critical'}
              label={version.isValid ? 'Composable' : 'Failed'}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-3">
              <div className="mr-1 truncate font-mono text-xs font-semibold">
                {version.origin.__typename === 'SchemaVersionPublishOrigin' &&
                version.origin.revision
                  ? version.origin.revision
                  : version.id.substring(0, 8)}
              </div>
              {version.origin.__typename === 'SchemaVersionPublishOrigin' && (
                <span className="text-2xs text-success font-mono uppercase tracking-wide">
                  Published
                </span>
              )}
              {version.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
                <span className="text-2xs text-critical font-mono uppercase tracking-wide">
                  Removed
                </span>
              )}
              {version.origin.__typename === 'SchemaVersionPromoteOrigin' && (
                <span className="text-2xs text-info font-mono uppercase tracking-wide">
                  Promoted
                </span>
              )}
            </div>

            {version.origin.__typename === 'SchemaVersionPublishOrigin' &&
              version.origin.publishedSubgraphs && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {version.origin.publishedSubgraphs.map((service, idx) => (
                    <span key={idx} className="text-xs">
                      <PackageIcon className="mt-0.25 mr-1 inline size-3" />
                      <span className="font-mono">
                        {service.name}@{service.revision ?? service.versionId.substring(0, 8)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            {version.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
              <div className="mb-1 flex flex-wrap gap-1">
                {version.origin.removedSubgraphs.map((service, idx) => (
                  <span key={idx} className="text-xs">
                    <PackageIcon className="mt-0.25 mr-1 inline size-3" />
                    <span className="font-mono">
                      {service.name}@{service.versionId.substring(0, 8)}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {version.origin.__typename === 'SchemaVersionPromoteOrigin' && (
              <p className="flex content-center text-xs">
                <FileSymlinkIcon className="mt-0.25 mr-1 inline size-3" />
                <span className="font-mono">
                  {version.origin.targetSlug}@{version.origin.schemaVersionId.substring(0, 8)}
                </span>
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col">
            <div className="flex gap-3">
              {version.meta?.commit && (
                <code className="hidden items-center font-mono text-xs md:flex">
                  <GitCommitVerticalIcon size="14" className="inline" />
                  {version.meta.commit.slice(0, 7)}
                </code>
              )}
            </div>
            <div className="mb-0 mt-auto hidden text-right text-xs sm:block">
              <TimeAgo date={version.date} />
            </div>
          </div>
        </Link>
      ))}
      {isLastPage && hasMore && (
        <Button
          variant="link"
          onClick={() => {
            const endCursor = versionsQuery.data?.target?.schemaVersions?.pageInfo?.endCursor;
            if (endCursor) {
              onLoadMore(endCursor);
            }
          }}
        >
          Load more
        </Button>
      )}
    </>
  );
}

/**
 * Selected along the same path as the target layout's query, so once the layout has loaded,
 * graphcache answers this without a request and the bare /history URL redirects at once.
 */
export const TargetHistoryLatestVersionQuery = graphql(`
  query TargetHistoryLatestVersionQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        target: targetBySlug(targetSlug: $targetSlug) {
          id
          latestSchemaVersion {
            id
          }
        }
      }
    }
  }
`);

const TargetHistoryPageQuery = graphql(`
  query TargetHistoryPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
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
      project {
        id
        type
      }
      id
      latestSchemaVersion {
        id
      }
    }
  }
`);

function HistoryPageContent() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: TargetHistoryPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
    },
  });
  const [pageVariables, setPageVariables] = useState([{ first: 10, after: null as string | null }]);
  const currentTarget = query.data?.target;
  const hasVersions = !!currentTarget?.latestSchemaVersion?.id;

  const { versionId } = useParams({
    strict: false /* allows to read the $versionId param of its child route */,
  }) as { versionId?: string };

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  if (hasVersions) {
    return (
      <>
        {/* Pinned and capped to the viewport, so the list scrolls inside the column. */}
        <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col self-start">
          <div className="py-6">
            <Title>Versions</Title>
            <Subtitle>Recently published versions.</Subtitle>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-5">
            <div className="border-line-subtle bg-surface-inset flex min-h-0 min-w-[420px] grow flex-col rounded-md border">
              <ScrollArea fill>
                <div className="flex flex-col gap-2.5 p-2.5">
                  {pageVariables.map((variables, i) => (
                    <ListPage
                      key={variables.after || 'initial'}
                      variables={variables}
                      isLastPage={i === pageVariables.length - 1}
                      onLoadMore={after => {
                        setPageVariables([...pageVariables, { after, first: 10 }]);
                      }}
                      versionId={versionId}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
        <Outlet />
      </>
    );
  }

  return (
    <div className="w-full">
      <div className="py-6">
        <Title>Versions</Title>
        <Subtitle>Recently published versions.</Subtitle>
      </div>
      {query.fetching ? null : (
        <NoSchemaVersion
          recommendedAction="publish"
          projectType={query.data?.target?.project.type ?? null}
        />
      )}
    </div>
  );
}

export function TargetHistoryPage() {
  return (
    <>
      <Meta title="History" />
      <LayoutContent className="flex flex-row gap-x-6">
        <HistoryPageContent />
      </LayoutContent>
    </>
  );
}
