import { savedFilterToSearchParams } from './search-params';

const base = {
  id: 'view-1',
  filters: {
    operationHashes: [],
    clientFilters: [],
    dateRange: null,
    excludeOperations: false,
    excludeClientFilters: false,
  },
};

describe('savedFilterToSearchParams', () => {
  it('spreads over the previous search, so empty dimensions clear their keys', () => {
    const params = savedFilterToSearchParams(base);
    expect(params.operations).toBeUndefined();
    expect(params.clients).toBeUndefined();
    expect(params.fields).toBeUndefined();
    expect(params.subgraphs).toBeUndefined();
    expect(params.viewId).toBe('view-1');
  });

  it('maps schema coordinates and subgraph names to the URL keys', () => {
    const params = savedFilterToSearchParams({
      ...base,
      filters: {
        ...base.filters,
        schemaCoordinates: ['Query.me', 'User.name'],
        subgraphNames: ['reviews'],
      },
    });
    expect(params.fields).toEqual(['Query.me', 'User.name']);
    expect(params.subgraphs).toEqual(['reviews']);
  });

  it('takes nullable exclude flags as the GraphQL result carries them', () => {
    const params = savedFilterToSearchParams({
      ...base,
      filters: { ...base.filters, excludeOperations: null, excludeClientFilters: true },
    });
    expect(params.excludeOperations).toBeUndefined();
    expect(params.excludeClients).toBe(true);
  });

  it('accepts a filter shape without the new keys', () => {
    // Saved filters read by documents that do not select them yet (or legacy rows).
    expect(savedFilterToSearchParams(base).fields).toBeUndefined();
  });
});
