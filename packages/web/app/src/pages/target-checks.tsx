import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from 'urql';
import { Page, TargetLayout } from '@/components/layouts/target';
import { BadgeRounded } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DocsLink } from '@/components/ui/docs-note';
import { EmptyList, NoSchemaVersion } from '@/components/ui/empty-list';
import { Label } from '@/components/ui/label';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { TimeAgo } from '@/components/ui/time-ago';
import { graphql } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { cn } from '@/lib/utils';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import {
  Outlet,
  Link as RouterLink,
  useNavigate,
  useParams,
  useSearch,
} from '@tanstack/react-router';

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
    organizationSlug: string;
    projectSlug: string;
    targetSlug: string;
    schemaCheckId?: string;
  } & SchemaCheckFilters,
) => {
  const search = useMemo(() => {
    return {
      filter_changed: props.showOnlyChanged,
      filter_failed: props.showOnlyFailed,
    };
  }, [props.showOnlyChanged, props.showOnlyFailed]);
  const [query] = useQuery({
    query: SchemaChecks_NavigationQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
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
            'flex flex-col rounded-md p-2.5 hover:bg-gray-800/40',
            edge.node.id === props.schemaCheckId ? 'bg-gray-800/40' : null,
          )}
        >
          <RouterLink
            key={edge.node.id}
            to="/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId"
            params={{
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
              schemaCheckId: edge.node.id,
            }}
            search={search}
          >
            <h3 className="truncate text-sm font-semibold">
              {edge.node.meta?.commit ?? edge.node.id}
            </h3>
            {edge.node.meta?.author ? (
              <div className="truncate text-xs font-medium text-gray-500">
                <span className="overflow-hidden truncate">{edge.node.meta.author}</span>
              </div>
            ) : null}
            <div className="mb-1.5 mt-2.5 flex align-middle text-xs font-medium text-[#c4c4c4]">
              <div
                className={cn(
                  edge.node.__typename === 'FailedSchemaCheck' ? 'text-red-500' : null,
                  'flex flex-row items-center gap-1',
                )}
              >
                <BadgeRounded
                  color={edge.node.__typename === 'FailedSchemaCheck' ? 'red' : 'green'}
                />
                <TimeAgo date={edge.node.createdAt} />
              </div>

              {edge.node.serviceName ? (
                <div className="ml-auto mr-0 w-1/2 truncate text-right font-bold">
                  {edge.node.serviceName}
                </div>
              ) : null}
            </div>
          </RouterLink>
          {edge.node.githubRepository && edge.node.meta ? (
            <a
              className="-ml-px text-xs font-medium text-gray-500 hover:text-gray-400"
              target="_blank"
              rel="noreferrer"
              href={`https://github.com/${edge.node.githubRepository}/commit/${edge.node.meta.commit}`}
            >
              <ExternalLinkIcon className="inline" /> associated with Git commit
            </a>
          ) : null}
        </div>
      ))}
      {props.isLastPage && query.data.target.schemaChecks.pageInfo.hasNextPage && (
        <Button variant="orangeLink" onClick={onLoadMore}>
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
      rateLimit {
        retentionInDays
      }
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
  const search = useSearch({
    from: '/authenticated/$organizationSlug/$projectSlug/$targetSlug/checks',
  }) as {
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

function ChecksPageContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { showOnlyChanged, showOnlyFailed, schemaCheckId } = useTargetCheckUrlParams();

  const [query] = useQuery({
    query: ChecksPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
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
        organizationSlug={props.organizationSlug}
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
          <SchemaChecksSideNav
            organizationSlug={props.organizationSlug}
            projectSlug={props.organizationSlug}
            targetSlug={props.targetSlug}
          >
            {hasFilteredSchemaChecks ? (
              <div className="flex w-[300px] grow flex-col gap-2.5 overflow-y-auto rounded-md border border-gray-800/50 p-2.5">
                {paginationVariables.map((cursor, index) => (
                  <Navigation
                    organizationSlug={props.organizationSlug}
                    projectSlug={props.projectSlug}
                    targetSlug={props.targetSlug}
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
            ) : (
              !isLoading && (
                <div className="my-4 cursor-default text-center text-sm text-gray-400">
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
        className="flex flex-row items-center"
      >
        Learn how to check your first schema
      </DocsLink>
    </>
  );
}

/**
 * Renders the section of the checks page for when there are checks existing in the backend
 */
function SchemaChecksSideNav(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  children: ReactNode;
}) {
  const navigate = useNavigate();
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
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex h-9 flex-row items-center justify-between">
          <Label htmlFor="filter-toggle-has-changes" className="text-sm font-normal text-gray-100">
            Show only changed schemas
          </Label>
          <Switch
            checked={showOnlyChanged}
            onCheckedChange={handleShowOnlyFilterChange}
            id="filter-toggle-has-changes"
          />
        </div>
        <div className="flex h-9 flex-row items-center justify-between">
          <Label
            htmlFor="filter-toggle-status-failed"
            className="text-sm font-normal text-gray-100"
          >
            Show only failed checks
          </Label>
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

export function TargetChecksPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  return (
    <>
      <Meta title="Schema Checks" />
      <TargetLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        page={Page.Checks}
        className="flex flex-row gap-x-6"
      >
        <ChecksPageContent {...props} />
      </TargetLayout>
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
