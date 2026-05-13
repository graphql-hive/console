import { ReactElement, useEffect, useState } from 'react';
import { CheckCircle2, GitCommitVerticalIcon, TriangleAlert } from 'lucide-react';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { cn } from '@/lib/utils';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { Link, Outlet, useParams, useRouter } from '@tanstack/react-router';

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
                targetName
              }
              ... on SchemaVersionPublishOrigin {
                publishedSubgraphs {
                  name
                  versionId
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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}): ReactElement {
  const { variables, isLastPage, onLoadMore, versionId } = props;
  const [versionsQuery] = useQuery({
    query: HistoryPage_VersionsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
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
            'flex items-start items-stretch gap-3 rounded-lg px-3 py-3',
            'hover:bg-neutral-5/40',
            versionId === version.id && 'bg-neutral-5/40',
          )}
          to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
          params={{
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
            versionId: version.id,
          }}
        >
          <div className="mt-0.5 flex-shrink-0">
            {version.isValid ? (
              <CheckCircle2 className={cn('size-4 text-green-500')} />
            ) : (
              <TriangleAlert className={cn('size-4 text-yellow-500')} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <div className="truncate font-mono text-xs font-semibold">
                {version.id.substring(0, 8)}
              </div>
              {version.origin.__typename === 'SchemaVersionPublishOrigin' && (
                <Badge variant="success">Published</Badge>
              )}
              {version.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
                <Badge variant="failure">Service Removed</Badge>
              )}
              {version.origin.__typename === 'SchemaVersionPromoteOrigin' && (
                <Badge variant="informal">Promoted</Badge>
              )}
            </div>

            {version.origin.__typename === 'SchemaVersionPublishOrigin' &&
              version.origin.publishedSubgraphs && (
                <div className="mb-1 flex flex-wrap gap-1">
                  {version.origin.publishedSubgraphs.map((service, idx) => (
                    <Badge key={idx} variant="outline" className="h-5 px-1.5 py-0 text-xs">
                      {service.name}@{service.versionId.substring(0, 8)}
                    </Badge>
                  ))}
                </div>
              )}
            {version.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
              <div className="mb-1 flex flex-wrap gap-1">
                {version.origin.removedSubgraphs.map((service, idx) => (
                  <Badge key={idx} variant="outline" className="h-5 px-1.5 py-0 text-xs">
                    {service.name}@{service.versionId.substring(0, 8)}
                  </Badge>
                ))}
              </div>
            )}
            {version.origin.__typename === 'SchemaVersionPromoteOrigin' && (
              <p className="text-muted-foreground text-xs">
                Promoted from{' '}
                <span className="text-foreground font-mono">
                  {version.origin.targetName}@{version.origin.schemaVersionId.substring(0, 8)}
                </span>
              </p>
            )}
          </div>

          <div className="flex flex-shrink-0 flex-col">
            <div className="flex gap-3">
              {version.meta?.commit && (
                <code className="text-muted-foreground flex hidden items-center font-mono text-xs md:block">
                  <GitCommitVerticalIcon size="14" className="inline" />
                  {version.meta.commit.slice(0, 7)}
                </code>
              )}
            </div>
            <div className="text-muted-foreground mb-0 mt-auto hidden text-right text-xs sm:block">
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

function HistoryPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const router = useRouter();
  const [query] = useQuery({
    query: TargetHistoryPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });
  const [pageVariables, setPageVariables] = useState([{ first: 10, after: null as string | null }]);
  const currentTarget = query.data?.target;
  const hasVersions = !!currentTarget?.latestSchemaVersion?.id;

  const { versionId } = useParams({
    strict: false /* allows to read the $versionId param of its child route */,
  }) as { versionId?: string };

  useEffect(() => {
    if (!versionId && currentTarget?.latestSchemaVersion?.id) {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug/history/$versionId',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
          versionId: currentTarget.latestSchemaVersion.id,
        },
      });
    }
  }, [versionId, currentTarget?.latestSchemaVersion?.id]);

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  if (hasVersions) {
    return (
      <>
        <div>
          <div className="py-6">
            <Title>Versions</Title>
            <Subtitle>Recently published schemas.</Subtitle>
          </div>
          <div className="flex flex-col gap-5">
            <div className="border-neutral-5/50 bg-neutral-2/50 flex min-w-[420px] grow flex-col gap-2.5 overflow-y-auto rounded-md border p-2.5">
              {pageVariables.map((variables, i) => (
                <ListPage
                  key={variables.after || 'initial'}
                  variables={variables}
                  isLastPage={i === pageVariables.length - 1}
                  onLoadMore={after => {
                    setPageVariables([...pageVariables, { after, first: 10 }]);
                  }}
                  versionId={versionId}
                  organizationSlug={props.organizationSlug}
                  projectSlug={props.projectSlug}
                  targetSlug={props.targetSlug}
                />
              ))}
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
        <Subtitle>Recently published schemas.</Subtitle>
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

export function TargetHistoryPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="History" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.History}
        className="flex flex-row gap-x-6"
      >
        <HistoryPageContent {...props} />
      </TargetLayout>
    </>
  );
}
