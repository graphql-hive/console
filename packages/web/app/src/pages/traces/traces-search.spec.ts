import {
  flattenLegacyTracesFilter,
  TracesFilterSearch,
  withoutTracesFilter,
} from './traces-search';

describe('flattenLegacyTracesFilter', () => {
  it('drops a status filter that kept both values, since it filtered nothing', () => {
    expect(flattenLegacyTracesFilter({ 'graphql.status': ['ok', 'error'] })).toEqual({});
  });

  it('keeps a lowered maximum without a zero minimum', () => {
    expect(flattenLegacyTracesFilter({ duration: [0, 2000] })).toEqual({ durationMax: 2000 });
  });

  it('drops operation kinds it does not know', () => {
    expect(flattenLegacyTracesFilter({ 'graphql.kind': ['QUERY', 'BATCH'] })).toEqual({
      operationTypes: ['query'],
    });
  });
});

describe('TracesFilterSearch', () => {
  it('reads http status codes parsed as numbers back as strings', () => {
    expect(TracesFilterSearch.parse({ httpStatusCodes: [200, 500] }).httpStatusCodes).toEqual([
      '200',
      '500',
    ]);
  });
});

describe('withoutTracesFilter', () => {
  it('removes every filter param and keeps the rest', () => {
    expect(withoutTracesFilter({ from: 'now-1d', status: 'ok', operationNames: ['a'] })).toEqual({
      from: 'now-1d',
    });
  });
});
