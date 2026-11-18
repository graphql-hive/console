import type { ItemsFilterDimension } from '@/components/ui/filters/filter-menu/types';
import {
  explorerTypesToFieldCoordinates,
  insightsFilterDimensions,
  schemaFilterItems,
  type InsightsFilterDimensionsInput,
} from './use-insights-filter-dimensions';

describe('explorerTypesToFieldCoordinates', () => {
  it('flattens object and interface fields to sorted Type.field, skipping other kinds', () => {
    expect(
      explorerTypesToFieldCoordinates([
        {
          __typename: 'GraphQLObjectType',
          name: 'User',
          fields: [{ name: 'name' }, { name: 'id' }],
        },
        { __typename: 'GraphQLInterfaceType', name: 'Node', fields: [{ name: 'id' }] },
        { __typename: 'GraphQLEnumType', name: 'Sort' },
        { __typename: 'GraphQLInputObjectType', name: 'Pagination' },
        { __typename: 'GraphQLObjectType', name: 'Query', fields: [{ name: 'me' }] },
      ]),
    ).toEqual(['Node.id', 'Query.me', 'User.id', 'User.name']);
  });
});

describe('schemaFilterItems', () => {
  it('keeps a selected name the schema no longer has, marked unavailable', () => {
    expect(schemaFilterItems(['Query.me'], ['Query.me', 'Query.gone'])).toEqual([
      { name: 'Query.me', values: [] },
      { name: 'Query.gone', values: [], unavailable: true },
    ]);
  });
});

describe('insightsFilterDimensions', () => {
  const navigated: unknown[] = [];
  const input: InsightsFilterDimensionsInput = {
    search: { fields: ['Query.me', 'Query.gone'] },
    navigate: (args => {
      navigated.push(args);
      return Promise.resolve();
    }) as InsightsFilterDimensionsInput['navigate'],
    operationFilterItems: [],
    clientFilterItems: [],
    hashToNameMap: new Map(),
    fieldCoordinates: ['Query.me', 'User.name'],
    schemaOptionsReady: true,
  };
  const byKey = (dims: ReturnType<typeof insightsFilterDimensions>, key: string) =>
    dims.find(d => d.key === key) as ItemsFilterDimension | undefined;

  it('adds Field after Operation and Client', () => {
    expect(insightsFilterDimensions(input).map(d => d.key)).toEqual([
      'operation',
      'client',
      'field',
    ]);
  });

  it('strikes nothing through until the schema options have answered', () => {
    const dims = insightsFilterDimensions({
      ...input,
      schemaOptionsReady: false,
      fieldCoordinates: [],
    });
    expect(byKey(dims, 'field')!.items).toEqual([
      { name: 'Query.me', values: [] },
      { name: 'Query.gone', values: [] },
    ]);
  });

  it('decodes URL names into selections without ids, matching the items by name', () => {
    const field = byKey(insightsFilterDimensions(input), 'field')!;
    expect(field.selectedItems).toEqual([
      { name: 'Query.me', values: null },
      { name: 'Query.gone', values: null },
    ]);
    expect(field.items).toContainEqual({ name: 'Query.gone', values: [], unavailable: true });
    expect(field.alwaysShowSearch).toBe(true);
    expect(field.unavailableNote).toBe('not in the current schema');
    expect(field.excludeMode).toBeUndefined();
  });

  it('writes a changed selection back to the URL and clears the key when empty', () => {
    const field = byKey(insightsFilterDimensions(input), 'field')!;
    field.onChange([{ name: 'User.name', values: null }]);
    field.onChange([]);
    const updates = navigated.map(call =>
      (call as { search: (prev: Record<string, unknown>) => Record<string, unknown> }).search({}),
    );
    expect(updates).toEqual([{ fields: ['User.name'] }, { fields: undefined }]);
  });
});
