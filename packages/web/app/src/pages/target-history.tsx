import { ReactElement } from 'react';
import { GitBranch } from 'lucide-react';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { BadgeRounded } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { useResetState } from '@/lib/hooks/use-reset-state';
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
            log {
              ... on PushedSchemaLog {
                id
                author
                service
                commit
              }
              ... on DeletedSchemaLog {
                id
                deletedService
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
function SchemaVersionListPage(props: {
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
        <div
          key={version.id}
          className={cn(
            'hover:bg-neutral-5/40 flex flex-col rounded-md p-2.5',
            versionId === version.id && 'bg-neutral-5/40',
          )}
        >
          <Link
            key={version.id}
            to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              versionId: version.id,
            }}
          >
            <h3 className="truncate text-sm font-semibold">
              {'commit' in version.log
                ? version.log.commit
                : `Deleted ${version.log.deletedService}`}
            </h3>
            {'author' in version.log ? (
              <div className="text-neutral-10 truncate text-xs font-medium">
                <span className="overflow-hidden truncate">{version.log.author}</span>
              </div>
            ) : null}
            <div className="text-neutral-10 mb-1.5 mt-2.5 flex align-middle text-xs font-medium">
              <div
                className={cn(
                  !version.isValid && 'text-red-500',
                  'flex flex-row items-center gap-1',
                )}
              >
                <BadgeRounded color={version.isValid ? 'green' : 'red'} /> Published
                <TimeAgo date={version.date} />
              </div>

              {'service' in version.log && version.log.service ? (
                <div className="ml-auto mr-0 w-1/2 truncate text-right font-bold">
                  {version.log.service}
                </div>
              ) : null}
            </div>
          </Link>
          {version.githubMetadata ? (
            <a
              className="text-neutral-10 hover:text-neutral-10 -ml-px text-xs font-medium"
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/${version.githubMetadata.repository}/commit/${version.githubMetadata.commit}`}
            >
              <ExternalLinkIcon className="inline" /> associated with Git commit
            </a>
          ) : null}
        </div>
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

const HistoryPage_GraphVersionsPageQuery = graphql(`
  query HistoryPage_GraphVersionsPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $graphName: String!
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
      graph(name: $graphName) {
        id
        versions(first: $first, after: $after) {
          edges {
            node {
              id
              isValid
              createdAt
            }
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    }
  }
`);

function GraphVersionListPage(props: {
  variables: { after: string | null; first: number };
  isLastPage: boolean;
  onLoadMore: (after: string) => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  graphName: string;
  activeVersionId?: string;
}): ReactElement {
  const { variables, isLastPage, onLoadMore } = props;
  const [versionsQuery] = useQuery({
    query: HistoryPage_GraphVersionsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
      graphName: props.graphName,
      ...variables,
    },
    requestPolicy: 'cache-and-network',
  });

  const edges = versionsQuery.data?.target?.graph?.versions.edges;
  const hasMore = versionsQuery.data?.target?.graph?.versions?.pageInfo?.hasNextPage ?? false;

  return (
    <>
      {edges?.map(({ node: version }) => (
        <div
          key={version.id}
          className={cn(
            'hover:bg-neutral-5/40 flex flex-col rounded-md p-2.5',
            props.activeVersionId === version.id && 'bg-neutral-5/40',
          )}
        >
          <Link
            key={version.id}
            to="/$organizationSlug/$projectSlug/$targetSlug/history/$graphName/version/$graphVersionId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              graphName: props.graphName,
              graphVersionId: version.id,
            }}
          >
            <h3 className="truncate text-sm font-semibold">Version {version.id.substring(0, 8)}</h3>
            {/*{'author' in version.log ? (
              <div className="text-neutral-10 truncate text-xs font-medium">
                <span className="overflow-hidden truncate">{version.log.author}</span>
              </div>
            ) : null}*/}
            <div className="text-neutral-10 mb-1.5 mt-2.5 flex align-middle text-xs font-medium">
              <div
                className={cn(
                  !version.isValid && 'text-red-500',
                  'flex flex-row items-center gap-1',
                )}
              >
                <BadgeRounded color={version.isValid ? 'green' : 'red'} /> Published
                <TimeAgo date={version.createdAt} />
              </div>

              {/*{'service' in version.log && version.log.service ? (
                <div className="ml-auto mr-0 w-1/2 truncate text-right font-bold">
                  {version.log.service}
                </div>
              ) : null}*/}
            </div>
          </Link>
          {/*{version.githubMetadata ? (
            <a
              className="text-neutral-10 hover:text-neutral-10 -ml-px text-xs font-medium"
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/${version.githubMetadata.repository}/commit/${version.githubMetadata.commit}`}
            >
              <ExternalLinkIcon className="inline" /> associated with Git commit
            </a>
          ) : null}*/}
        </div>
      ))}
      {isLastPage && hasMore && (
        <Button
          variant="link"
          onClick={() => {
            const endCursor = versionsQuery.data?.target?.graph?.versions?.pageInfo?.endCursor;
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
      activeGraphs {
        id
        name
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
  const { graphVersionId, graphName } = useParams({
    strict: false /* allows to read the $versionId param of its child route */,
  }) as { graphVersionId?: string; graphName?: string };
  const activeGraphName =
    query.data?.target?.activeGraphs.find(graph => graph.name === graphName)?.name ?? null;
  const [pageVariables, setPageVariables] = useResetState(
    () => [{ first: 10, after: null as string | null }],
    [activeGraphName],
  );
  const currentTarget = query.data?.target;
  const hasVersions = !!currentTarget?.latestSchemaVersion?.id;

  // useEffect(() => {
  //   if (!graphVersionId && currentTarget?.latestSchemaVersion?.id) {
  //     void router.navigate({
  //       to: '/$organizationSlug/$projectSlug/$targetSlug/history/$graphName/version/$graphVersionId',
  //       params: {
  //         organizationSlug: props.organizationSlug,
  //         projectSlug: props.projectSlug,
  //         targetSlug: props.targetSlug,
  //         graphName: graphName ?? 'default',
  //         graphVersionId: currentTarget.latestSchemaVersion.id,
  //       },
  //     });
  //   }
  // }, [graphVersionId, currentTarget?.latestSchemaVersion?.id]);

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
          <div className="flex py-6">
            <div>
              <Title>Versions</Title>
              <Subtitle>Recent schema versions.</Subtitle>
            </div>
            <div className="ml-auto shrink">
              <Select
                name="Graph Variant"
                value={graphName}
                onValueChange={newValue => {
                  void router.navigate({
                    to: '/$organizationSlug/$projectSlug/$targetSlug/history/$graphName',
                    params: {
                      organizationSlug: props.organizationSlug,
                      projectSlug: props.projectSlug,
                      targetSlug: props.targetSlug,
                      graphName: newValue,
                    },
                  });
                }}
              >
                <SelectTrigger>
                  <GitBranch size="10" className="mr-2" />
                  <SelectValue placeholder="Select graph" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">default</SelectItem>
                  {currentTarget.activeGraphs.map(graph => (
                    <SelectItem value={graph.name}>{graph.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-5">
            <div className="border-neutral-5/50 bg-neutral-2/50 flex min-w-[420px] grow flex-col gap-2.5 overflow-y-auto rounded-md border p-2.5">
              {graphName === 'default' ? (
                <>
                  {pageVariables.map((variables, i) => (
                    <SchemaVersionListPage
                      key={variables.after || 'initial'}
                      variables={variables}
                      isLastPage={i === pageVariables.length - 1}
                      onLoadMore={after => {
                        setPageVariables([...pageVariables, { after, first: 10 }]);
                      }}
                      versionId={graphVersionId}
                      organizationSlug={props.organizationSlug}
                      projectSlug={props.projectSlug}
                      targetSlug={props.targetSlug}
                    />
                  ))}
                </>
              ) : activeGraphName ? (
                <>
                  {pageVariables.map((variables, i) => (
                    <GraphVersionListPage
                      key={`${activeGraphName}|${variables.after || 'initial'}`}
                      variables={variables}
                      isLastPage={i === pageVariables.length - 1}
                      onLoadMore={after => {
                        setPageVariables([...pageVariables, { after, first: 10 }]);
                      }}
                      organizationSlug={props.organizationSlug}
                      projectSlug={props.projectSlug}
                      targetSlug={props.targetSlug}
                      graphName={activeGraphName}
                    />
                  ))}
                </>
              ) : null}
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
        <Subtitle>Recent schema versions.</Subtitle>
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
