import { ReactElement } from 'react';
import { FileSymlinkIcon, GitCommitVerticalIcon, PackageIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { Button } from '@/components/ui/primitives/button/button';
import { ScrollArea } from '@/components/ui/primitives/scroll-area/scroll-area';
import { StatusDot } from '@/components/ui/primitives/status-dot/status-dot';
import { QueryError } from '@/components/ui/query-error';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { useResetState } from '@/lib/hooks/use-reset-state';
import * as shared from '@/styles/shared.css';
import { Link, Outlet, useParams } from '@tanstack/react-router';
import { targetHistoryStyles } from './target-history.css';

export const HistoryPage_VersionsPageQuery = graphql(`
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

export function versionsPageVariables(
  slugs: { organizationSlug: string; projectSlug: string; targetSlug: string },
  after: string | null,
) {
  return { ...slugs, first: 10, after };
}

// One query whose pages the cache merges (Target.schemaVersions in urql-cache.ts).
function VersionsList(props: { versionId?: string }): ReactElement {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { versionId } = props;
  const [after, setAfter] = useResetState<string | null>(null, [
    organizationSlug,
    projectSlug,
    targetSlug,
  ]);
  const [versionsQuery] = useQuery({
    query: HistoryPage_VersionsPageQuery,
    variables: versionsPageVariables({ organizationSlug, projectSlug, targetSlug }, after),
  });

  const edges = versionsQuery.data?.target?.schemaVersions.edges;
  const pageInfo = versionsQuery.data?.target?.schemaVersions.pageInfo;

  return (
    <>
      {edges?.map(({ node: version }) => (
        <Link
          key={version.id}
          className={targetHistoryStyles.version({ selected: versionId === version.id })}
          to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
          params={{
            organizationSlug,
            projectSlug,
            targetSlug,
            versionId: version.id,
          }}
        >
          <div className={targetHistoryStyles.versionStatus}>
            <StatusDot
              color={version.isValid ? 'success' : 'critical'}
              label={version.isValid ? 'Composable' : 'Failed'}
            />
          </div>
          <div className={shared.fillShrinkable}>
            <div className={targetHistoryStyles.versionTitle}>
              <div className={targetHistoryStyles.versionId}>
                {version.origin.__typename === 'SchemaVersionPublishOrigin' &&
                version.origin.revision
                  ? version.origin.revision
                  : version.id.substring(0, 8)}
              </div>
              {version.origin.__typename === 'SchemaVersionPublishOrigin' && (
                <span className={targetHistoryStyles.published}>Published</span>
              )}
              {version.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
                <span className={targetHistoryStyles.removed}>Removed</span>
              )}
              {version.origin.__typename === 'SchemaVersionPromoteOrigin' && (
                <span className={targetHistoryStyles.promoted}>Promoted</span>
              )}
            </div>

            {version.origin.__typename === 'SchemaVersionPublishOrigin' &&
              version.origin.publishedSubgraphs && (
                <div className={targetHistoryStyles.services}>
                  {version.origin.publishedSubgraphs.map((service, idx) => (
                    <span key={idx} className={shared.text.xs}>
                      <PackageIcon className={targetHistoryStyles.serviceIcon} />
                      <span className={shared.mono}>
                        {service.name}@{service.revision ?? service.versionId.substring(0, 8)}
                      </span>
                    </span>
                  ))}
                </div>
              )}
            {version.origin.__typename === 'SchemaVersionSubgraphRemoveOrigin' && (
              <div className={targetHistoryStyles.services}>
                {version.origin.removedSubgraphs.map((service, idx) => (
                  <span key={idx} className={shared.text.xs}>
                    <PackageIcon className={targetHistoryStyles.serviceIcon} />
                    <span className={shared.mono}>
                      {service.name}@{service.versionId.substring(0, 8)}
                    </span>
                  </span>
                ))}
              </div>
            )}
            {version.origin.__typename === 'SchemaVersionPromoteOrigin' && (
              <p className={targetHistoryStyles.source}>
                <FileSymlinkIcon className={targetHistoryStyles.sourceIcon} />
                <span className={shared.mono}>
                  {version.origin.targetSlug}@{version.origin.schemaVersionId.substring(0, 8)}
                </span>
              </p>
            )}
          </div>

          <div className={targetHistoryStyles.versionMeta}>
            <div className={targetHistoryStyles.versionMetaRow}>
              {version.meta?.commit && (
                <code className={targetHistoryStyles.commit}>
                  <GitCommitVerticalIcon size="14" className={targetHistoryStyles.commitIcon} />
                  {version.meta.commit.slice(0, 7)}
                </code>
              )}
            </div>
            <div className={targetHistoryStyles.versionDate}>
              <TimeAgo date={version.date} />
            </div>
          </div>
        </Link>
      ))}
      {pageInfo?.hasNextPage && (
        <Button
          variant="link"
          disabled={versionsQuery.stale}
          onClick={() => {
            if (pageInfo.endCursor) {
              setAfter(pageInfo.endCursor);
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

export const TargetHistoryPageQuery = graphql(`
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
        <div className={targetHistoryStyles.sidebar}>
          <div className={targetHistoryStyles.sidebarHeader}>
            <Title>Versions</Title>
            <Subtitle>Recently published versions.</Subtitle>
          </div>
          <div className={targetHistoryStyles.sidebarBody}>
            <div className={targetHistoryStyles.list}>
              <ScrollArea fill>
                <div className={targetHistoryStyles.listBody}>
                  <VersionsList versionId={versionId} />
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
    <div className={shared.fullWidth}>
      <div className={targetHistoryStyles.content}>
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
      <LayoutContent className={targetHistoryStyles.page}>
        <HistoryPageContent />
      </LayoutContent>
    </>
  );
}
