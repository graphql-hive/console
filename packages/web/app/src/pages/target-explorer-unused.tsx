import { memo, useEffect, useMemo, useState } from 'react';
import { AlertCircleIcon, PartyPopperIcon } from 'lucide-react';
import { useQuery } from 'urql';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { focusRingQuiet } from '@/components/base/shared-styles';
import { LayoutContent } from '@/components/layouts/layout-content';
import {
  ExplorerFilteredEmptyState,
  GraphQLFieldsSkeleton,
  GraphQLTypeCardSkeleton,
} from '@/components/target/explorer/common';
import { ExplorerHeader } from '@/components/target/explorer/explorer-header';
import {
  SchemaExplorerProvider,
  useSchemaExplorerContext,
} from '@/components/target/explorer/provider';
import { matchesSubgraphFilter } from '@/components/target/explorer/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { EmptyList, NoSchemaVersion } from '@/components/ui/empty-list';
import { Link } from '@/components/ui/link';
import { Meta } from '@/components/ui/meta';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import { cn } from '@/lib/utils';
import { TypeRenderer, TypeRenderFragment } from './target-explorer-type';

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
      <div className="flex h-[250px] shrink-0 items-center justify-center rounded-md border border-dashed">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <PartyPopperIcon className="text-success size-10" />

          <h3 className="mt-4 text-lg font-semibold">No unused types</h3>
          <p className="text-fg-secondary mb-4 mt-2 text-sm">
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
    <div className="space-y-6">
      {unusedFieldsMessage.length ? (
        <div>
          <p className="text-fg-secondary text-sm">
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
                  className={cn(
                    'inline-flex h-9 items-center px-2 py-1 text-sm font-medium transition-colors',
                    focusRingQuiet,
                    letter === activeLetter
                      ? 'bg-neutral-2 text-accent'
                      : 'text-fg-secondary hover:bg-neutral-2 hover:text-accent',
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
      <div className="flex flex-col gap-4">
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

const UnusedSchemaExplorer_UnusedSchemaQuery = graphql(`
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

function UnusedSchemaExplorer({
  dataRetentionInDays,
  hasCollectedOperations,
}: {
  dataRetentionInDays: number;
  hasCollectedOperations: boolean;
}) {
  const { organizationSlug, projectSlug, targetSlug } = useSlugs('target');
  const dateRangeController = useDateRangeController({
    dataRetentionInDays,
    defaultPreset: presetLast7Days,
  });

  const [query, refresh] = useQuery({
    query: UnusedSchemaExplorer_UnusedSchemaQuery,
    variables: {
      organizationSlug,
      projectSlug,
      targetSlug,
      period: dateRangeController.resolvedRange,
    },
    pause: !hasCollectedOperations,
  });

  useEffect(() => {
    if (!query.fetching) {
      refresh({ requestPolicy: 'network-only' });
    }
  }, [dateRangeController.resolvedRange]);

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
  const dateRangeFilter = (
    <DateRangePicker
      size="compact"
      validUnits={['y', 'M', 'w', 'd', 'h']}
      selectedRange={dateRangeController.selectedPreset.range}
      startDate={dateRangeController.startDate}
      align="start"
      onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
    />
  );

  return (
    <>
      <ExplorerHeader
        title="Unused Schema"
        description="Helps you understand the coverage of GraphQL schema and safely remove the unused part"
        period={dateRangeController.resolvedRange}
        subgraphNames={latestValidSchemaVersion?.explorer?.subgraphNames}
        metadataAttributes={latestValidSchemaVersion?.explorer?.metadataAttributes}
        dateRangeControl={dateRangeFilter}
      />

      {!hasCollectedOperations ? (
        <div className="py-8">
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
                <Alert className="mb-3">
                  <AlertCircleIcon className="size-4" />
                  <AlertTitle>Outdated Schema</AlertTitle>
                  <AlertDescription className="max-w-[600px]">
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

const TargetExplorerUnusedSchemaPageQuery = graphql(`
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

  return (
    <UnusedSchemaExplorer
      dataRetentionInDays={currentOrganization.usageRetentionInDays}
      hasCollectedOperations={hasCollectedOperations}
    />
  );
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
