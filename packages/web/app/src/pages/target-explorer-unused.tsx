import { memo, useMemo, useState } from 'react';
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
import { EmptyList, NoSchemaVersion } from '@/components/ui/empty-list';
import { Link } from '@/components/ui/link';
import { Meta } from '@/components/ui/meta';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useLayoutQuery, useSlugs } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import * as shared from '@/styles/shared.css';
import { getRouteApi } from '@tanstack/react-router';
import { TypeRenderer, TypeRenderFragment } from './target-explorer-type';
import { targetExplorerUnusedStyles } from './target-explorer-unused.css';

const UnusedSchemaView_UnusedSchemaExplorerFragment = graphql(`
  fragment UnusedSchemaView_UnusedSchemaExplorerFragment on UnusedSchemaExplorer {
    types {
      __typename
      ... on GraphQLObjectType {
        name
        fields {
          __typename
          args {
            __typename
          }
        }
      }
      ... on GraphQLInterfaceType {
        name
        fields {
          __typename
          args {
            __typename
          }
        }
      }
      ... on GraphQLUnionType {
        name
      }
      ... on GraphQLEnumType {
        name
      }
      ... on GraphQLInputObjectType {
        name
        fields {
          __typename
        }
      }
      ... on GraphQLScalarType {
        name
      }
      ...TypeRenderFragment
    }
  }
`);

function InternalUnusedSchemaView(props: {
  explorer: FragmentType<typeof UnusedSchemaView_UnusedSchemaExplorerFragment>;
  totalRequests: number;
}) {
  const [selectedLetter, setSelectedLetter] = useState<string>();
  const { types } = useFragment(UnusedSchemaView_UnusedSchemaExplorerFragment, props.explorer);
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

  const letters = useMemo(() => {
    return Array.from(typesGroupedByFirstLetter.keys()).sort();
  }, [typesGroupedByFirstLetter]);

  // The selected letter can vanish when the filter changes.
  const activeLetter =
    selectedLetter && letters.includes(selectedLetter) ? selectedLetter : letters[0];

  const unused = useMemo(() => {
    const count = {
      fields: 0,
      fieldArguments: 0,
      types: 0,
    };

    for (const type of visibleTypes) {
      if (type.__typename === 'GraphQLInputObjectType') {
        count.types++;
        count.fields += type.fields.length;
      } else if (
        type.__typename === 'GraphQLObjectType' ||
        type.__typename === 'GraphQLInterfaceType'
      ) {
        count.types++;

        for (const field of type.fields) {
          if (field.args.length === 0) {
            // if there are no arguments, it means the entire field is unused
            count.fields++;
          } else {
            // if there are arguments, the field is used, but the arguments are not
            count.fieldArguments += field.args.length;
          }
        }
      }
    }

    return count;
  }, [visibleTypes]);

  if (types.length === 0) {
    return (
      <div className={targetExplorerUnusedStyles.empty}>
        <div className={targetExplorerUnusedStyles.emptyBody}>
          <PartyPopperIcon className={targetExplorerUnusedStyles.emptyIcon} />

          <h3 className={targetExplorerUnusedStyles.emptyTitle}>No unused types</h3>
          <p className={targetExplorerUnusedStyles.emptyText}>
            It looks like you are using all typea in your schema, congratulations!
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

  const unusedFieldsMessage = [
    unused.fields ? `${unused.fields} unused fields` : null,
    unused.fieldArguments ? `${unused.fieldArguments} unused field arguments` : null,
  ]
    .filter(Boolean)
    .join(' and ');

  return (
    <div className={targetExplorerUnusedStyles.sections}>
      {unusedFieldsMessage.length ? (
        <div>
          <p className={targetExplorerUnusedStyles.hint}>
            You have a total of {unusedFieldsMessage} within {unused.types} different types in the
            selected time period
          </p>
        </div>
      ) : null}
      <div>
        <>
          {letters.map(letter => (
            <Tooltip
              key={letter}
              trigger={
                <button
                  type="button"
                  onClick={() => setSelectedLetter(letter)}
                  className={targetExplorerUnusedStyles.letter({ active: letter === activeLetter })}
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
              warnAboutDeprecatedArguments={false}
              warnAboutUnusedArguments
            />
          );
        })}
      </div>
    </div>
  );
}

const UnusedSchemaView = memo(InternalUnusedSchemaView);

const unusedRoute = getRouteApi(
  '/authenticated/with-header/$organizationSlug/$projectSlug/$targetSlug/explorer/unused',
);

export const UnusedSchemaExplorer_UnusedSchemaQuery = graphql(`
  query UnusedSchemaExplorer_UnusedSchemaQuery(
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
        unusedSchema(period: { absoluteRange: $period }) {
          ...UnusedSchemaView_UnusedSchemaExplorerFragment
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

function UnusedSchemaExplorer({ hasCollectedOperations }: { hasCollectedOperations: boolean }) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const dataRetentionInDays =
    useLayoutQuery('target').data?.organization?.usageRetentionInDays ?? 7;
  const dateRangeController = useDateRangeController({
    dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });

  // Resolved by the route loader, so the page and the loader ask for one period.
  const { period } = unusedRoute.useLoaderData();

  const [query] = useQuery({
    query: UnusedSchemaExplorer_UnusedSchemaQuery,
    variables: { organizationSlug, projectSlug, targetSlug, period },
    pause: !hasCollectedOperations,
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
        title="Unused Schema"
        description="Helps you understand the coverage of GraphQL schema and safely remove the unused part"
        period={period}
        subgraphNames={latestValidSchemaVersion?.explorer?.subgraphNames}
        metadataAttributes={latestValidSchemaVersion?.explorer?.metadataAttributes}
        dateRangeControl={<DateRangeFilter controller={dateRangeController} />}
      />

      {!hasCollectedOperations ? (
        <div className={targetExplorerUnusedStyles.content}>
          <EmptyList
            title="Hive is waiting for your first collected operation"
            description="You can collect usage of your GraphQL API with Hive Client"
            docsUrl="/schema-registry/usage-reporting"
          />
        </div>
      ) : !query.fetching && !query.stale ? (
        <>
          {latestValidSchemaVersion?.unusedSchema && latestSchemaVersion ? (
            <>
              {latestSchemaVersion.id !== latestValidSchemaVersion.id && (
                <Alert className={targetExplorerUnusedStyles.alert}>
                  <AlertCircleIcon className={targetExplorerUnusedStyles.alertIcon} />
                  <AlertTitle>Outdated Schema</AlertTitle>
                  <AlertDescription className={targetExplorerUnusedStyles.alertDescription}>
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
              <UnusedSchemaView
                totalRequests={query.data?.target?.operationsStats.totalRequests ?? 0}
                explorer={latestValidSchemaVersion.unusedSchema}
              />
            </>
          ) : (
            <NoSchemaVersion
              recommendedAction="publish"
              projectType={query.data?.target?.project.type ?? null}
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

export const TargetExplorerUnusedSchemaPageQuery = graphql(`
  query TargetExplorerUnusedSchemaPageQuery(
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

function ExplorerUnusedSchemaPageContent() {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const [query] = useQuery({
    query: TargetExplorerUnusedSchemaPageQuery,
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
  const hasCollectedOperations = query.data?.hasCollectedOperations === true;

  if (!currentOrganization) {
    return null;
  }

  return <UnusedSchemaExplorer hasCollectedOperations={hasCollectedOperations} />;
}

export function TargetExplorerUnusedPage() {
  return (
    <>
      <Meta title="Unused Schema Explorer" />
      <SchemaExplorerProvider>
        <LayoutContent>
          <ExplorerUnusedSchemaPageContent />
        </LayoutContent>
      </SchemaExplorerProvider>
    </>
  );
}
