import type { SavedFilterView } from './use-insights-filter-extra-sections';
import { hasUnsavedChanges, toInsightsFilterInput, type CurrentFilters } from './utils';

const current: CurrentFilters = {
  operations: ['h1', 'h2'],
  clients: [{ name: 'web', versions: null }],
  dateRange: { from: 'now-7d', to: 'now' },
  excludeOperations: false,
  excludeClientFilters: false,
  schemaCoordinates: ['User.name', 'Query.me'],
};

const view: SavedFilterView = {
  id: 'view-1',
  name: 'Viewer fields',
  viewerCanUpdate: true,
  filters: {
    operationHashes: ['h2', 'h1'],
    clientFilters: [{ name: 'web', versions: null }],
    dateRange: { from: 'now-7d', to: 'now' },
    excludeOperations: false,
    excludeClientFilters: false,
    schemaCoordinates: ['Query.me', 'User.name'],
  },
};

describe('toInsightsFilterInput', () => {
  it('carries schema coordinates into the mutation input', () => {
    expect(toInsightsFilterInput(current)).toMatchObject({
      operationHashes: ['h1', 'h2'],
      schemaCoordinates: ['User.name', 'Query.me'],
    });
  });
});

describe('hasUnsavedChanges', () => {
  it('ignores ordering within each dimension', () => {
    expect(hasUnsavedChanges(view, current)).toBe(false);
  });

  it('sees a changed field selection', () => {
    expect(hasUnsavedChanges(view, { ...current, schemaCoordinates: ['Query.me'] })).toBe(true);
  });
});
