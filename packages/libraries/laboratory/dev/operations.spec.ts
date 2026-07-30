import { devActiveTabId, devOperations, devTabs } from './operations';
import { queryPlanFixtures } from './query-plan-fixtures';

describe('dev operations', () => {
  // An operation is only reachable through a tab, so a mismatched id seeds a tab
  // that renders nothing rather than failing loudly.
  it.each(devTabs)('tab $id points at a seeded operation', tab => {
    const data = tab.data as { id: string };

    expect(devOperations.map(o => o.id)).toContain(data.id);
  });

  it('has an active tab id that exists', () => {
    expect(devTabs.map(t => t.id)).toContain(devActiveTabId);
  });

  it.each(devOperations.filter(o => o.headers))('$name has JSON headers', operation => {
    expect(() => JSON.parse(operation.headers)).not.toThrow();
  });

  // An unknown fixture name comes back as null, which looks identical to the
  // server never having sent a plan.
  it.each(devOperations.filter(o => o.headers.includes('x-query-plan')))(
    '$name requests a known query plan fixture',
    operation => {
      const headers = JSON.parse(operation.headers) as Record<string, string>;

      expect(Object.keys(queryPlanFixtures)).toContain(headers['x-query-plan']);
    },
  );
});
