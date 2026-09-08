import { useMemo } from 'react';
import { useQuery } from 'urql';
import type { FilterDimension } from '@/components/base/floating/filter-menu/filter-menu';
import { graphql } from '@/gql';
import { useRouter } from '@tanstack/react-router';
import {
  fromMetadataSelections,
  toMetadataItems,
  toMetadataSelections,
  type MetadataAttribute,
} from './metadata-filter-params';
import { useSchemaExplorerContext } from './provider';
import { matchesSubgraphFilter } from './utils';

const TypeFilter_AllTypes = graphql(`
  query TypeFilter_AllTypes(
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
      __typename
      id
      latestValidSchemaVersion {
        __typename
        id
        isValid
        explorer(usage: { period: $period }) {
          types {
            __typename
            supergraphMetadata {
              ownedByServiceNames
            }
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
          }
        }
      }
    }
  }
`);

const EXPLORER_ROUTE = '/$organizationSlug/$projectSlug/$targetSlug/explorer' as const;
const EXPLORER_TYPE_ROUTE =
  '/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename' as const;

export type ExplorerFilterDimensionsOptions = {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  period: { from: string; to: string };
  /** Set on the type detail route, so the Type dimension reflects the current type. */
  typename?: string;
  subgraphNames?: readonly string[] | null;
  metadataAttributes?: readonly MetadataAttribute[] | null;
  /**
   * Type, Field and Show descriptions only apply to the All and Type views.
   * The Unused and Deprecated views render their own tables, so they get just
   * Subgraph and Metadata.
   */
  includeSchemaDimensions?: boolean;
};

/**
 * Builds the explorer's filter menu. State lives where it already did: the
 * route param for Type, the `search` / `subgraph` / `meta` search params for
 * the rest, and localStorage for the descriptions toggle. Nothing here owns
 * state of its own.
 */
export function useExplorerFilterDimensions({
  organizationSlug,
  projectSlug,
  targetSlug,
  period,
  typename,
  subgraphNames,
  metadataAttributes,
  includeSchemaDimensions = false,
}: ExplorerFilterDimensionsOptions): FilterDimension[] {
  const router = useRouter();
  const {
    subgraphs,
    setSubgraphFilters,
    clearSubgraphFilter,
    metadata,
    setMetadataFilters,
    clearMetadataFilter,
    isDescriptionsVisible,
    setDescriptionsVisible,
  } = useSchemaExplorerContext();

  const [typesQuery] = useQuery({
    query: TypeFilter_AllTypes,
    variables: { organizationSlug, projectSlug, targetSlug, period },
    requestPolicy: 'cache-first',
    pause: !includeSchemaDimensions,
  });

  const allNamedTypes = typesQuery.data?.target?.latestValidSchemaVersion?.explorer?.types;

  // An active subgraph filter narrows which types are reachable, so the picker
  // should not offer types the page would then render as empty.
  const typeItems = useMemo(
    () =>
      allNamedTypes
        ?.filter(type =>
          matchesSubgraphFilter(type.supergraphMetadata?.ownedByServiceNames, subgraphs),
        )
        .map(type => ({ name: type.name, values: [] })) ?? [],
    [allNamedTypes, subgraphs],
  );

  const searchParams = router.latestLocation.search;
  const fieldSearch =
    'search' in searchParams && typeof searchParams.search === 'string' ? searchParams.search : '';

  return useMemo(() => {
    const params = { organizationSlug, projectSlug, targetSlug };
    const attributes = metadataAttributes ?? [];
    const dimensions: FilterDimension[] = [];

    if (includeSchemaDimensions) {
      dimensions.push(
        {
          key: 'type',
          label: 'Type',
          items: typeItems,
          selectedItems: typename ? [{ name: typename, values: null }] : [],
          // Picking a type is navigation, not a value: one type is addressable
          // at a time, and clearing returns to the full schema view.
          singleSelect: true,
          alwaysShowSearch: true,
          onChange: selections => {
            const next = selections[0]?.name;
            void router.navigate(
              next
                ? {
                    to: EXPLORER_TYPE_ROUTE,
                    params: { ...params, typename: next },
                    search: searchParams,
                  }
                : { to: EXPLORER_ROUTE, params, search: searchParams },
            );
          },
          onRemove: () => {
            void router.navigate({ to: EXPLORER_ROUTE, params, search: searchParams });
          },
        },
        {
          key: 'field',
          label: 'Field',
          kind: 'text',
          value: fieldSearch,
          placeholder: 'Find field',
          onChange: value => {
            void router.navigate({
              search: { ...searchParams, search: value === '' ? undefined : value },
              replace: true,
            });
          },
        },
      );
    }

    if (subgraphNames?.length) {
      dimensions.push({
        key: 'subgraph',
        label: 'Subgraph',
        labelPlural: 'subgraphs',
        items: subgraphNames.map(name => ({ name, values: [] })),
        selectedItems: subgraphs.map(name => ({ name, values: null })),
        onChange: selections => setSubgraphFilters(selections.map(selection => selection.name)),
        onRemove: clearSubgraphFilter,
      });
    }

    if (attributes.length) {
      dimensions.push({
        key: 'metadata',
        label: 'Metadata',
        labelPlural: 'metadata',
        valuesLabel: 'values',
        items: toMetadataItems(attributes),
        selectedItems: toMetadataSelections(metadata, attributes),
        onChange: selections => setMetadataFilters(fromMetadataSelections(selections, attributes)),
        onRemove: () => clearMetadataFilter(),
      });
    }

    if (includeSchemaDimensions) {
      dimensions.push({
        key: 'descriptions',
        label: 'Show descriptions',
        kind: 'toggle',
        checked: isDescriptionsVisible,
        onChange: setDescriptionsVisible,
      });
    }

    return dimensions;
  }, [
    includeSchemaDimensions,
    typeItems,
    typename,
    fieldSearch,
    subgraphNames,
    subgraphs,
    setSubgraphFilters,
    clearSubgraphFilter,
    metadataAttributes,
    metadata,
    setMetadataFilters,
    clearMetadataFilter,
    isDescriptionsVisible,
    setDescriptionsVisible,
    router,
    searchParams,
    organizationSlug,
    projectSlug,
    targetSlug,
  ]);
}
