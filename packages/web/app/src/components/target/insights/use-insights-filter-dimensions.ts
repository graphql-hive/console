import { useMemo } from 'react';
import {
  selectionsToClients,
  selectionsToOperations,
} from '@/components/target/insights/search-params';
import type {
  FilterDimension,
  FilterItem,
  FilterSelection,
} from '@/components/ui/filters/filter-menu/types';
import {
  encodeIdSelections,
  urlFilterDimension,
} from '@/components/ui/filters/filter-menu/url-filter';
import { graphql } from '@/gql';
import type { useNavigate } from '@tanstack/react-router';

/**
 * Options for the Fields and Subgraphs dimensions, read from the latest valid schema version
 * rather than from usage so a filter can target a field or subgraph with no traffic yet.
 * Period-independent, so it is not part of the picker query a date-range change refetches.
 */
export const InsightsSchemaFilterOptions_Query = graphql(`
  query InsightsSchemaFilterOptions($selector: TargetSelectorInput!) {
    target(reference: { bySelector: $selector }) {
      id
      project {
        id
        type
      }
      latestValidSchemaVersion {
        id
        explorer {
          subgraphNames
          types {
            __typename
            ... on GraphQLObjectType {
              name
              fields {
                name
              }
            }
            ... on GraphQLInterfaceType {
              name
              fields {
                name
              }
            }
          }
        }
      }
    }
  }
`);

type ExplorerType = {
  __typename: string;
  name?: string;
  fields?: ReadonlyArray<{ name: string }>;
};

/**
 * Flattens the explorer's types to sorted `Type.field` coordinates. Only object and interface
 * fields: the Subgraphs dimension resolves to the same set server-side, and enum values or input
 * fields are not what people mean by "operations that use this field".
 */
export function explorerTypesToFieldCoordinates(types: ReadonlyArray<ExplorerType>): string[] {
  const coordinates: string[] = [];
  for (const type of types) {
    if (
      (type.__typename === 'GraphQLObjectType' || type.__typename === 'GraphQLInterfaceType') &&
      type.name &&
      type.fields
    ) {
      for (const field of type.fields) {
        coordinates.push(`${type.name}.${field.name}`);
      }
    }
  }
  return coordinates.sort((a, b) => a.localeCompare(b));
}

/**
 * Items for a dimension whose options come from the schema; selected names not in it stay visible.
 * Until the schema has answered, the selections stand in as plain items, so none reads as missing.
 */
export function schemaFilterItems(
  names: readonly string[],
  selected: readonly string[],
  ready = true,
): FilterItem[] {
  if (!ready) {
    return selected.map(name => ({ name, values: [] }));
  }
  const known = new Set(names);
  return [
    ...names.map(name => ({ name, values: [] })),
    ...selected
      .filter(name => !known.has(name))
      .map(name => ({ name, values: [], unavailable: true })),
  ];
}

/** Selections for a dimension keyed by name alone (no ids, no sub-values). */
export const nameSelections = (names: unknown): FilterSelection[] =>
  Array.isArray(names) ? (names as string[]).map(name => ({ name, values: null })) : [];

// Subgraph names are lowercase in the schema; a hand-typed URL may not be.
const lowercaseNames = (names: unknown): string[] =>
  Array.isArray(names) ? (names as string[]).map(name => name.toLowerCase()) : [];

/** The `unavailableNote` for dimensions whose options come from the schema. */
export const SCHEMA_UNAVAILABLE_NOTE = 'not in the current schema';

type InsightsSearchShape = {
  operations?: string[];
  clients?: Array<{ name: string; versions: string[] | null }>;
  excludeOperations?: boolean;
  excludeClients?: boolean;
  fields?: string[];
  subgraphs?: string[];
};

export type InsightsFilterDimensionsInput = {
  search: InsightsSearchShape;
  navigate: ReturnType<typeof useNavigate>;
  operationFilterItems: FilterItem[];
  clientFilterItems: FilterItem[];
  hashToNameMap: Map<string, string>;
  /** `Type.field` coordinates of the latest valid version. */
  fieldCoordinates: readonly string[];
  /** Subgraph names of the latest valid version. */
  subgraphNames: readonly string[];
  /** False while the schema options are loading or failed: nothing is struck through yet. */
  schemaOptionsReady: boolean;
  /**
   * False on non-federation projects, which have no subgraphs to filter by. A URL that already
   * carries subgraphs still gets the dimension so the filter can be seen and removed.
   */
  showSubgraphs: boolean;
};

/** The hook's body, pure so it can be exercised without React. */
export function insightsFilterDimensions({
  search,
  navigate,
  operationFilterItems,
  clientFilterItems,
  hashToNameMap,
  fieldCoordinates,
  subgraphNames,
  schemaOptionsReady,
  showSubgraphs,
}: InsightsFilterDimensionsInput): FilterDimension[] {
  const operationsDim = urlFilterDimension({
    navigate,
    search,
    searchKey: 'operations',
    excludeKey: 'excludeOperations',
    key: 'operation',
    label: 'Operation',
    items: operationFilterItems,
    encode: selectionsToOperations,
    decode: value => {
      if (!Array.isArray(value)) return [];
      return (value as string[]).map(hash => ({
        id: hash,
        name: hashToNameMap.get(hash) ?? hash,
        values: null,
      }));
    },
  });

  const clientsDim = urlFilterDimension({
    navigate,
    search,
    searchKey: 'clients',
    excludeKey: 'excludeClients',
    key: 'client',
    label: 'Client',
    items: clientFilterItems,
    valuesLabel: 'versions',
    encode: selectionsToClients,
    decode: value => {
      if (!Array.isArray(value)) return [];
      return (value as Array<{ name: string; versions: string[] | null }>).map<FilterSelection>(
        c => ({ name: c.name, values: c.versions }),
      );
    },
  });

  const fieldsDim = urlFilterDimension({
    navigate,
    search,
    searchKey: 'fields',
    key: 'field',
    label: 'Field',
    items: schemaFilterItems(fieldCoordinates, search.fields ?? [], schemaOptionsReady),
    encode: encodeIdSelections,
    decode: nameSelections,
    // A schema has far more fields than anyone scans; people arrive knowing the name.
    alwaysShowSearch: true,
    unavailableNote: SCHEMA_UNAVAILABLE_NOTE,
  });

  const dimensions: FilterDimension[] = [operationsDim, clientsDim, fieldsDim];

  const selectedSubgraphs = lowercaseNames(search.subgraphs);
  if (showSubgraphs || selectedSubgraphs.length > 0) {
    dimensions.push(
      urlFilterDimension({
        navigate,
        search,
        searchKey: 'subgraphs',
        key: 'subgraph',
        label: 'Subgraph',
        items: schemaFilterItems(subgraphNames, selectedSubgraphs, schemaOptionsReady),
        encode: encodeIdSelections,
        decode: value => nameSelections(lowercaseNames(value)),
        unavailableNote: SCHEMA_UNAVAILABLE_NOTE,
      }),
    );
  }

  return dimensions;
}

/**
 * Builds the FilterDimension array describing the Insights-page filters (operations, clients,
 * fields and, on federation projects, subgraphs), wired to URL search params via
 * `urlFilterDimension`. The page provides the picker-derived items, a hash→name map (URL-stored
 * operations are hashes shown as names) and the schema-derived option lists.
 */
export function useInsightsFilterDimensions(
  input: InsightsFilterDimensionsInput,
): FilterDimension[] {
  const {
    search,
    navigate,
    operationFilterItems,
    clientFilterItems,
    hashToNameMap,
    fieldCoordinates,
    subgraphNames,
    schemaOptionsReady,
    showSubgraphs,
  } = input;
  return useMemo<FilterDimension[]>(
    () =>
      insightsFilterDimensions({
        search,
        navigate,
        operationFilterItems,
        clientFilterItems,
        hashToNameMap,
        fieldCoordinates,
        subgraphNames,
        schemaOptionsReady,
        showSubgraphs,
      }),
    [
      navigate,
      search.operations,
      search.clients,
      search.excludeOperations,
      search.excludeClients,
      search.fields,
      search.subgraphs,
      operationFilterItems,
      clientFilterItems,
      hashToNameMap,
      fieldCoordinates,
      subgraphNames,
      schemaOptionsReady,
      showSubgraphs,
    ],
  );
}
