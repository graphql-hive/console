import { parseQueryPlan } from './parse';

const PLAN = {
  kind: 'QueryPlan',
  node: { kind: 'Fetch', serviceName: 'accounts', operation: '{ me { id } }' },
};

describe('parseQueryPlan', () => {
  it('reads a plan out of extensions', () => {
    expect(parseQueryPlan(JSON.stringify({ data: {}, extensions: { queryPlan: PLAN } }))).toEqual(
      PLAN,
    );
  });

  it('returns null instead of throwing on a body that is not JSON', () => {
    // History holds whatever the server sent, and this runs during render.
    expect(() => parseQueryPlan('<html>502 Bad Gateway</html>')).not.toThrow();
    expect(parseQueryPlan('<html>502 Bad Gateway</html>')).toBeNull();
  });

  it('returns null when there is no plan to show', () => {
    expect(parseQueryPlan(undefined)).toBeNull();
    expect(parseQueryPlan('')).toBeNull();
    expect(parseQueryPlan(JSON.stringify({ data: {} }))).toBeNull();
    expect(parseQueryPlan(JSON.stringify({ data: {}, extensions: {} }))).toBeNull();
  });

  it('rejects an extensions.queryPlan that is not a query plan', () => {
    expect(parseQueryPlan(JSON.stringify({ extensions: { queryPlan: {} } }))).toBeNull();
    expect(
      parseQueryPlan(JSON.stringify({ extensions: { queryPlan: { kind: 'Something' } } })),
    ).toBeNull();
  });
});
