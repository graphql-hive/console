import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { Label } from '@/components/base/label/label';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { StatusDot } from '@/components/base/status-dot/status-dot';
import { Switch } from '@/components/base/switch/switch';
import { LayoutContent } from '@/components/layouts/layout-content';
import { DocsLink } from '@/components/ui/docs-note';
import { EmptyList, NoSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { getRouteApi, Link, Outlet, useParams } from '@tanstack/react-router';

const checksRoute = getRouteApi('/authenticated/$organizationSlug/$projectSlug/$targetSlug/checks');

const SchemaChecks_NavigationQuery = graphql(`
  query SchemaChecks_NavigationQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $after: String
    $filters: SchemaChecksFilter
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
      schemaChecks(first: 20, after: $after, filters: $filters) {
        edges {
          node {
            __typename
            id
            createdAt
            serviceName
            meta {
              commit
              author
            }
            githubRepository
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      }
    }
  }
`);

interface SchemaCheckFilters {
  showOnlyFailed: boolean;
  showOnlyChanged: boolean;
}

const Navigation = (
  props: {
    after: string | null;
    isLastPage: boolean;
    onLoadMore: (cursor: string) => void;
    schemaCheckId?: string;
  } & SchemaCheckFilters,
) => {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const search = useMemo(() => {
    return {
      filter_changed: props.showOnlyChanged,
      filter_failed: props.showOnlyFailed,
    };
  }, [props.showOnlyChanged, props.showOnlyFailed]);
  const [query] = useQuery({
    query: SchemaChecks_NavigationQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      after: props.after,
      filters: {
        changed: props.showOnlyChanged,
        failed: props.showOnlyFailed,
      },
    },
  });

  const onLoadMore = useCallback(() => {
    props.onLoadMore(query.data?.target?.schemaChecks.pageInfo.endCursor ?? '');
  }, [query.data?.target?.schemaChecks.pageInfo.endCursor, props.onLoadMore]);

  if (query.fetching) {
    return (
      <div className="mt-4 flex w-full grow flex-col items-center">
        <Spinner />
      </div>
    );
  }

  if (!query.data?.target?.schemaChecks) {
    return null;
  }

  return (
    <>
      {query.data.target.schemaChecks.edges.map(edge => (
        <div
          key={edge.node.id}
          className={cn(
            'hover:bg-surface-hover flex flex-col rounded-md p-2.5',
            edge.node.id === props.schemaCheckId ? 'bg-surface-selected' : null,
          )}
        >
          <Link
            key={edge.node.id}
            to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId"
            params={{ organizationSlug, projectSlug, targetSlug, schemaCheckId: edge.node.id }}
            search={search}
          >
            <h3 className="truncate text-sm font-semibold">
              {edge.node.meta?.commit ?? edge.node.id}
            </h3>
            {edge.node.meta?.author ? (
              <div className="text-fg-secondary truncate text-xs font-medium">
                <span className="overflow-hidden truncate">{edge.node.meta.author}</span>
              </div>
            ) : null}
            <div className="text-fg-secondary mb-1.5 mt-2.5 flex align-middle text-xs font-medium">
              <div
                className={cn(
                  edge.node.__typename === 'FailedSchemaCheck' ? 'text-critical' : null,
                  'flex flex-row items-center gap-1',
                )}
              >
                <StatusDot
                  color={edge.node.__typename === 'FailedSchemaCheck' ? 'critical' : 'success'}
                  label={edge.node.__typename === 'FailedSchemaCheck' ? 'Failed' : 'Passed'}
                />
                <TimeAgo date={edge.node.createdAt} />
              </div>

              {edge.node.serviceName ? (
                <div className="ml-auto mr-0 w-1/2 truncate text-right font-bold">
                  {edge.node.serviceName}
                </div>
              ) : null}
            </div>
          </Link>
          {edge.node.githubRepository && edge.node.meta ? (
            <a
              className="text-fg-secondary hover:text-fg-secondary -ml-px text-xs font-medium"
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/${edge.node.githubRepository}/commit/${edge.node.meta.commit}`}
            >
              <ExternalLink className="inline size-4" /> associated with Git commit
            </a>
          ) : null}
        </div>
      ))}
      {props.isLastPage && query.data.target.schemaChecks.pageInfo.hasNextPage && (
        <Button variant="link" onClick={onLoadMore}>
          Load more
        </Button>
      )}
    </>
  );
};

const ChecksPageQuery = graphql(`
  query ChecksPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $filters: SchemaChecksFilter
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
      project {
        id
        type
      }
      schemaChecks(first: 1) {
        edges {
          node {
            id
          }
        }
      }
      filteredSchemaChecks: schemaChecks(first: 1, filters: $filters) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`);

function useTargetCheckUrlParams() {
  const { schemaCheckId } = useParams({
    strict: false /* allows to read the $schemaCheckId param of its child route */,
  }) as { schemaCheckId?: string };
  const search = checksRoute.useSearch() as {
    filter_changed?: boolean;
    filter_failed?: boolean;
  };
  return {
    showOnlyChanged: search.filter_changed ?? false,
    showOnlyFailed: search.filter_failed ?? false,
    schemaCheckId,
    rawSearch: search,
  };
}

function ChecksPageContent() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const { showOnlyChanged, showOnlyFailed, schemaCheckId } = useTargetCheckUrlParams();

  const [query] = useQuery({
    query: ChecksPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      filters: {
        changed: showOnlyChanged,
        failed: showOnlyFailed,
      },
    },
  });

  const isLoading = query.fetching || query.stale;
  const renderLoading = useDebouncedLoader(isLoading);

  const [hasSchemaChecks, setHasSchemaChecks] = useState(
    !!query.data?.target?.schemaChecks?.edges?.length,
  );

  useEffect(() => {
    if (!isLoading) {
      setHasSchemaChecks(!!query.data?.target?.schemaChecks?.edges?.length);
    }
  }, [isLoading, !query.data?.target?.schemaChecks?.edges?.length]);

  const hasFilteredSchemaChecks = !!query.data?.target?.filteredSchemaChecks?.edges?.length;
  const hasActiveSchemaCheck = !!schemaCheckId;
  const [paginationVariables, setPaginationVariables] = useState<Array<string | null>>(() => [
    null,
  ]);

  const onLoadMore = (cursor: string) => setPaginationVariables(cursors => [...cursors, cursor]);

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  return (
    <>
      <div className={cn(!hasSchemaChecks && 'w-full')}>
        <div className="w-[300px] py-6">
          <Title>Schema Checks</Title>
          <Subtitle>Recently checked schemas.</Subtitle>
        </div>
        {/* if done loading and there are schema checks found associated w this target */}
        {hasSchemaChecks && (
          <SchemaChecksSideNav>
            {hasFilteredSchemaChecks ? (
              <div className="border-line-subtle flex min-h-0 w-[300px] grow flex-col rounded-md border">
                <ScrollArea fill>
                  <div className="flex flex-col gap-2.5 p-2.5">
                    {paginationVariables.map((cursor, index) => (
                      <Navigation
                        schemaCheckId={schemaCheckId}
                        after={cursor}
                        isLastPage={index + 1 === paginationVariables.length}
                        onLoadMore={onLoadMore}
                        key={cursor ?? 'first'}
                        showOnlyChanged={showOnlyChanged}
                        showOnlyFailed={showOnlyFailed}
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              !isLoading && (
                <div className="text-fg-secondary my-4 cursor-default text-center text-sm">
                  No schema checks found with the current filters
                </div>
              )
            )}
          </SchemaChecksSideNav>
        )}
        {!hasSchemaChecks && !isLoading && (
          <NoSchemaChecks projectType={query.data?.target?.project.type ?? null} />
        )}
        {renderLoading && (
          <div className="mt-4 flex w-full grow flex-col items-center">
            <Spinner />
          </div>
        )}
      </div>
      {hasSchemaChecks && <Outlet />}
      {hasSchemaChecks && !hasActiveSchemaCheck && (
        <EmptyList
          className="my-4 mt-6 justify-center border-0 py-8"
          title="Select a schema check"
          description="A list of your schema checks is available on the left."
        />
      )}
    </>
  );
}

function NoSchemaChecks(props: { projectType: ProjectType | null }) {
  return (
    <>
      <div className="cursor-default text-sm">
        <NoSchemaVersion projectType={props.projectType} recommendedAction="check" />
      </div>
      <DocsLink
        href="/features/schema-registry#check-a-schema"
        text="Learn how to check your first schema"
      />
    </>
  );
}

/**
 * Renders the section of the checks page for when there are checks existing in the backend
 */
function SchemaChecksSideNav(props: { children: ReactNode }) {
  const navigate = checksRoute.useNavigate();
  const { showOnlyChanged, showOnlyFailed, rawSearch } = useTargetCheckUrlParams();

  const handleShowOnlyFilterChange = () => {
    void navigate({
      search: {
        ...rawSearch,
        filter_changed: !showOnlyChanged,
      },
      replace: true,
    });
  };

  const handleShowOnlyFilterFailed = () => {
    void navigate({
      search: {
        ...rawSearch,
        filter_failed: !showOnlyFailed,
      },
      replace: true,
    });
  };

  return (
    // Pinned and capped to the viewport, so the list scrolls inside the column rather than
    // stretching the page when there are more checks than fit.
    <div className="sticky top-6 flex max-h-[calc(100vh-3rem)] flex-col gap-5 self-start">
      <div>
        <div className="flex h-9 flex-row items-center justify-between">
          <Label
            variant="inline"
            htmlFor="filter-toggle-has-changes"
            label="Show only changed schemas"
          />
          <Switch
            checked={showOnlyChanged}
            onCheckedChange={handleShowOnlyFilterChange}
            id="filter-toggle-has-changes"
          />
        </div>
        <div className="flex h-9 flex-row items-center justify-between">
          <Label
            variant="inline"
            htmlFor="filter-toggle-status-failed"
            label="Show only failed checks"
          />
          <Switch
            checked={showOnlyFailed}
            onCheckedChange={handleShowOnlyFilterFailed}
            id="filter-toggle-status-failed"
          />
        </div>
      </div>
      {props.children}
    </div>
  );
}

export function TargetChecksPage() {
  return (
    <>
      <Meta title="Schema Checks" />
      <LayoutContent className="flex flex-row gap-x-6">
        <ChecksPageContent />
      </LayoutContent>
    </>
  );
}

const useDebouncedLoader = (isLoading: boolean, delay = 500): boolean => {
  const [showLoadingIcon, setShowLoadingIcon] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isLoading) {
      // Start a timer to show the loading icon after the delay
      timerRef.current = setTimeout(() => {
        setShowLoadingIcon(true);
      }, delay);
    } else {
      // If loading finishes, clear any pending timer and hide the icon
      clearTimeout(timerRef.current);
      setShowLoadingIcon(false);
    }

    // Cleanup function to clear the timer on unmount or if isLoading changes
    return () => {
      clearTimeout(timerRef.current);
    };
  }, [isLoading, delay]);

  return showLoadingIcon;
};
