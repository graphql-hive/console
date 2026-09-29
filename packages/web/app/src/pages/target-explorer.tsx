import { useRef } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import {
  GraphQLFieldsSkeleton,
  GraphQLTypeCardSkeleton,
} from '@/components/target/explorer/common';
import { ExplorerHeader } from '@/components/target/explorer/explorer-header';
import { DateRangeFilter } from '@/components/target/explorer/filter';
import { GraphQLObjectTypeComponent } from '@/components/target/explorer/object-type';
import { SchemaExplorerProvider } from '@/components/target/explorer/provider';
import { useScrollRestoration } from '@/components/target/explorer/scroll-restoration';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { presetLast7Days } from '@/components/ui/date-range-picker';
import { NoSchemaVersion, noValidSchemaVersion } from '@/components/ui/empty-list';
import { Meta } from '@/components/ui/meta';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLayoutQuery, useSlugs } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { getRouteApi, Link } from '@tanstack/react-router';

const ExplorerPage_SchemaExplorerFragment = graphql(`
  fragment ExplorerPage_SchemaExplorerFragment on SchemaExplorer {
    query {
      ...GraphQLObjectTypeComponent_TypeFragment
    }
    mutation {
      ...GraphQLObjectTypeComponent_TypeFragment
    }
    subscription {
      ...GraphQLObjectTypeComponent_TypeFragment
    }
  }
`);

function SchemaView(props: {
  explorer: FragmentType<typeof ExplorerPage_SchemaExplorerFragment>;
  totalRequests: number;
}) {
  const { query, mutation, subscription } = useFragment(
    ExplorerPage_SchemaExplorerFragment,
    props.explorer,
  );
  const { totalRequests } = props;

  return (
    <div className="flex flex-col gap-4">
      {query ? (
        <GraphQLObjectTypeComponent
          type={query}
          totalRequests={totalRequests}
          warnAboutDeprecatedArguments={false}
          warnAboutUnusedArguments={false}
        />
      ) : null}
      {mutation ? (
        <GraphQLObjectTypeComponent
          type={mutation}
          totalRequests={totalRequests}
          warnAboutDeprecatedArguments={false}
          warnAboutUnusedArguments={false}
        />
      ) : null}
      {subscription ? (
        <GraphQLObjectTypeComponent
          type={subscription}
          totalRequests={totalRequests}
          warnAboutDeprecatedArguments={false}
          warnAboutUnusedArguments={false}
        />
      ) : null}
    </div>
  );
}

const explorerRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/explorer',
);

export const TargetExplorerPageQuery = graphql(`
  query TargetExplorerPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $period: DateRangeInput!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      usageRetentionInDays
      slug
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
      slug
      latestSchemaVersion {
        id
      }
      latestValidSchemaVersion {
        __typename
        id
        explorer(usage: { period: $period }) {
          subgraphNames
          metadataAttributes {
            name
            values
          }
          ...ExplorerPage_SchemaExplorerFragment
        }
      }
      project {
        id
        type
      }
      operationsStats(period: $period) {
        totalRequests
      }
    }
  }
`);

function ExplorerPageContent() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const dataRetentionInDays =
    useLayoutQuery('target').data?.organization?.usageRetentionInDays ?? 7;
  const dateRangeController = useDateRangeController({
    dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });
  // Resolved by the route loader, so the page and the loader ask for one period.
  const { period } = explorerRoute.useLoaderData();
  const [query] = useQuery({
    query: TargetExplorerPageQuery,
    variables: { organizationSlug, projectSlug, targetSlug, period },
  });

  /* to avoid janky behaviour we keep track if the version has a successful explorer once, and in that case always show the filter bar. */
  const isFilterVisible = useRef(false);

  const currentTarget = query.data?.target;
  const latestSchemaVersion = currentTarget?.latestSchemaVersion;
  const latestValidSchemaVersion = currentTarget?.latestValidSchemaVersion;

  if (latestValidSchemaVersion?.explorer) {
    isFilterVisible.current = true;
  }

  useScrollRestoration(
    !!(!query.fetching && latestValidSchemaVersion?.explorer && latestSchemaVersion),
  );

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
      <ExplorerHeader
        title="Explore Schema"
        description="Insights from the latest version."
        period={period}
        includeSchemaDimensions
        showFilters={isFilterVisible.current}
        subgraphNames={latestValidSchemaVersion?.explorer?.subgraphNames}
        metadataAttributes={latestValidSchemaVersion?.explorer?.metadataAttributes}
        dateRangeControl={<DateRangeFilter controller={dateRangeController} />}
      />
      {/* No data means "not known yet", not "no schema". */}
      {!query.fetching && !query.stale && query.data ? (
        <>
          {latestValidSchemaVersion?.explorer && latestSchemaVersion ? (
            <>
              {latestSchemaVersion.id !== latestValidSchemaVersion.id && (
                <Alert className="mb-3">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Outdated Schema</AlertTitle>
                  <AlertDescription>
                    The latest schema version is <span className="font-bold">not valid</span> , thus
                    the explorer might not be accurate as it is showing the{' '}
                    <span className="font-bold">latest valid</span> schema version. We recommend you
                    to publish a new schema version that is composable before using this explorer
                    for decision making.
                    <br />
                    <br />
                    <Link
                      to="/$organizationSlug/$projectSlug/$targetSlug/history/$versionId"
                      params={{
                        organizationSlug,
                        projectSlug,
                        targetSlug,
                        versionId: latestSchemaVersion.id,
                      }}
                    >
                      <span className="font-bold"> See the invalid schema version</span>
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              <SchemaView
                totalRequests={query.data?.target?.operationsStats.totalRequests ?? 0}
                explorer={latestValidSchemaVersion.explorer}
              />
            </>
          ) : latestSchemaVersion ? (
            noValidSchemaVersion
          ) : (
            <NoSchemaVersion
              projectType={query.data?.target?.project.type ?? null}
              recommendedAction="publish"
            />
          )}
        </>
      ) : (
        <GraphQLTypeCardSkeleton>
          <GraphQLFieldsSkeleton count={15} />
        </GraphQLTypeCardSkeleton>
      )}
    </>
  );
}

export function TargetExplorerPage() {
  return (
    <>
      <Meta title="Schema Explorer" />
      <SchemaExplorerProvider>
        <LayoutContent>
          <ExplorerPageContent />
        </LayoutContent>
      </SchemaExplorerProvider>
    </>
  );
}
