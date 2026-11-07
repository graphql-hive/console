import { memo, ReactElement, useMemo, useState } from 'react';
import { AlertCircleIcon, PartyPopperIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import {
  ExplorerFilteredEmptyState,
  GraphQLFieldsSkeleton,
  GraphQLTypeCardSkeleton,
} from '@/components/target/explorer/common';
import { ExplorerHeader } from '@/components/target/explorer/explorer-header';
import { DateRangeFilter } from '@/components/target/explorer/filter';
import {
  SchemaExplorerProvider,
  useSchemaExplorerContext,
} from '@/components/target/explorer/provider';
import { matchesSubgraphFilter } from '@/components/target/explorer/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { presetLast7Days } from '@/components/ui/date-range-picker';
import { NoSchemaVersion } from '@/components/ui/empty-list';
import { Link } from '@/components/ui/link';
import { Meta } from '@/components/ui/meta';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { focusRingQuiet } from '@/components/ui/primitives/shared-styles';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLayoutQuery, useSlugs } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { cn } from '@/lib/utils';
import * as shared from '@/styles/shared.css';
import { getRouteApi } from '@tanstack/react-router';
import { TypeRenderer, TypeRenderFragment } from './target-explorer-type';
import * as styles from './target-explorer-deprecated.css';

const DeprecatedSchemaView_DeprecatedSchemaExplorerFragment = graphql(`
  fragment DeprecatedSchemaView_DeprecatedSchemaExplorerFragment on DeprecatedSchemaExplorer {
    types {
      __typename
      ... on GraphQLObjectType {
        name
      }
      ... on GraphQLInterfaceType {
        name
      }
      ... on GraphQLUnionType {
        name
      }
      ... on GraphQLEnumType {
        name
      }
      ... on GraphQLInputObjectType {
        name
      }
      ... on GraphQLScalarType {
        name
      }
      ...TypeRenderFragment
    }
  }
`);

function InternalDeprecatedSchemaView(props: {
  explorer: FragmentType<typeof DeprecatedSchemaView_DeprecatedSchemaExplorerFragment>;
  totalRequests: number;
}) {
  const [selectedLetter, setSelectedLetter] = useState<string>();
  const { types } = useFragment(
    DeprecatedSchemaView_DeprecatedSchemaExplorerFragment,
    props.explorer,
  );
  const { subgraphs } = useSchemaExplorerContext();

  // The letter index has to be built from the types that will actually render,
  // otherwise a filtered-out type leaves behind a letter with nothing under it.
  // useFragment is an identity function, so indexes line up with `types`.
  const unmaskedTypes = useFragment(TypeRenderFragment, types);
  const visibleTypes = useMemo(
    () =>
      types.filter((_, index) =>
        matchesSubgraphFilter(
          unmaskedTypes[index]?.supergraphMetadata?.ownedByServiceNames,
          subgraphs,
        ),
      ),
    [types, unmaskedTypes, subgraphs],
  );

  const typesGroupedByFirstLetter = useMemo(() => {
    const grouped = new Map<string, FragmentType<typeof TypeRenderFragment>[]>([]);

    for (const type of visibleTypes) {
      const letter = type.name[0].toLocaleUpperCase();
      const existingNameGroup = grouped.get(letter);

      if (existingNameGroup) {
        existingNameGroup.push(type);
      } else {
        grouped.set(letter, [type]);
      }
    }
    return grouped;
  }, [visibleTypes]);

  const letters = Array.from(typesGroupedByFirstLetter.keys()).sort();
  // The selected letter can vanish when the filter changes.
  const activeLetter =
    selectedLetter && letters.includes(selectedLetter) ? selectedLetter : letters[0];

  if (types.length === 0) {
    return (
      <div className={styles.internalDeprecatedSchemaViewDiv}>
        <div className={styles.internalDeprecatedSchemaViewDiv2}>
          <PartyPopperIcon className={styles.internalDeprecatedSchemaViewPartyPopperIcon} />

          <h3 className={styles.internalDeprecatedSchemaViewH3}>No deprecations found</h3>
          <p className={styles.internalDeprecatedSchemaViewP}>
            It looks like you are maintaining your schema well, congratulations!
          </p>
        </div>
      </div>
    );
  }

  if (visibleTypes.length === 0) {
    return <ExplorerFilteredEmptyState />;
  }

  if (!activeLetter) {
    return null;
  }

  return (
    <div className={styles.internalDeprecatedSchemaViewDiv3}>
      <div>
        <>
          {letters.map(letter => (
            <Tooltip
              key={letter}
              trigger={
                <button
                  type="button"
                  onClick={() => setSelectedLetter(letter)}
                  className={cn(
                    styles.internalDeprecatedSchemaViewButton,
                    focusRingQuiet,
                    letter === activeLetter
                      ? styles.internalDeprecatedSchemaViewButton2
                      : styles.internalDeprecatedSchemaViewButton3,
                  )}
                >
                  {letter}
                </button>
              }
              content={`${typesGroupedByFirstLetter.get(letter)?.length ?? 0} types`}
            />
          ))}
        </>
      </div>
      <div className={shared.stack.gap4}>
        {(typesGroupedByFirstLetter.get(activeLetter) ?? []).map((type, i) => {
          return (
            <TypeRenderer
              key={i}
              type={type}
              totalRequests={props.totalRequests}
              warnAboutDeprecatedArguments
              warnAboutUnusedArguments={false}
            />
          );
        })}
      </div>
    </div>
  );
}

const DeprecatedSchemaView = memo(InternalDeprecatedSchemaView);

const deprecatedRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated',
);

export const DeprecatedSchemaExplorer_DeprecatedSchemaQuery = graphql(`
  query DeprecatedSchemaExplorer_DeprecatedSchemaQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
    $period: DateRangeInput!
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
      slug
      latestSchemaVersion {
        id
      }
      latestValidSchemaVersion {
        __typename
        id
        explorer {
          subgraphNames
          metadataAttributes {
            name
            values
          }
        }
        deprecatedSchema(period: { absoluteRange: $period }) {
          ...DeprecatedSchemaView_DeprecatedSchemaExplorerFragment
        }
      }
      operationsStats(period: $period) {
        totalRequests
      }
    }
  }
`);

function DeprecatedSchemaExplorer() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const dataRetentionInDays =
    useLayoutQuery('target').data?.organization?.usageRetentionInDays ?? 7;
  const dateRangeController = useDateRangeController({
    dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });

  // Resolved by the route loader, so the page and the loader ask for one period.
  const { period } = deprecatedRoute.useLoaderData();

  const [query] = useQuery({
    query: DeprecatedSchemaExplorer_DeprecatedSchemaQuery,
    variables: { organizationSlug, projectSlug, targetSlug, period },
  });

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const latestSchemaVersion = query.data?.target?.latestSchemaVersion;
  const latestValidSchemaVersion = query.data?.target?.latestValidSchemaVersion;
  return (
    <>
      <ExplorerHeader
        title="Deprecated Schema"
        description="Understand the deprecated part of GraphQL schema"
        period={period}
        subgraphNames={latestValidSchemaVersion?.explorer?.subgraphNames}
        metadataAttributes={latestValidSchemaVersion?.explorer?.metadataAttributes}
        dateRangeControl={<DateRangeFilter controller={dateRangeController} />}
      />
      {!query.fetching && !query.stale ? (
        <>
          {latestValidSchemaVersion?.deprecatedSchema && latestSchemaVersion ? (
            <>
              {latestSchemaVersion.id !== latestValidSchemaVersion.id && (
                <Alert className={styles.deprecatedSchemaExplorerAlert}>
                  <AlertCircleIcon className={styles.deprecatedSchemaExplorerAlertCircleIcon} />
                  <AlertTitle>Outdated Schema</AlertTitle>
                  <AlertDescription className={styles.deprecatedSchemaExplorerAlertDescription}>
                    The latest schema version is{' '}
                    <span className={shared.weight.bold}>not valid</span> , thus the explorer might
                    not be accurate as it is showing the{' '}
                    <span className={shared.weight.bold}>latest valid</span> schema version. We
                    recommend you to publish a new schema version that is composable before using
                    this explorer for decision making.
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
                      <span className={shared.weight.bold}> See the invalid schema version</span>
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
              <DeprecatedSchemaView
                totalRequests={query.data?.target?.operationsStats.totalRequests ?? 0}
                explorer={latestValidSchemaVersion.deprecatedSchema}
              />
            </>
          ) : (
            <NoSchemaVersion
              recommendedAction="publish"
              projectType={query.data?.target?.project?.type ?? null}
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

export const TargetExplorerDeprecatedSchemaPageQuery = graphql(`
  query TargetExplorerDeprecatedSchemaPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      usageRetentionInDays
      slug
    }
    hasCollectedOperations(
      selector: {
        organizationSlug: $organizationSlug
        projectSlug: $projectSlug
        targetSlug: $targetSlug
      }
    )
  }
`);

function ExplorerDeprecatedSchemaPageContent() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: TargetExplorerDeprecatedSchemaPageQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
    },
  });

  if (query.error) {
    return (
      <QueryError
        organizationSlug={organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  const currentOrganization = query.data?.organization;

  if (!currentOrganization) {
    return null;
  }

  return <DeprecatedSchemaExplorer />;
}

export function TargetExplorerDeprecatedPage(): ReactElement {
  return (
    <>
      <Meta title="Deprecated Schema Explorer" />
      <SchemaExplorerProvider>
        <LayoutContent>
          <ExplorerDeprecatedSchemaPageContent />
        </LayoutContent>
      </SchemaExplorerProvider>
    </>
  );
}
