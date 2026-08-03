import { QueryPlanSchema } from '../src/lib/query-plan/schema';
import { queryPlanFixtures, resolveQueryPlanFixture } from './query-plan-fixtures';

const collectKinds = (node: unknown, kinds = new Set<string>()): Set<string> => {
  if (Array.isArray(node)) {
    node.forEach(child => collectKinds(child, kinds));
    return kinds;
  }

  if (node && typeof node === 'object') {
    const record = node as Record<string, unknown>;

    if (typeof record.kind === 'string') {
      kinds.add(record.kind);
    }

    Object.values(record).forEach(value => collectKinds(value, kinds));
  }

  return kinds;
};

describe('query plan fixtures', () => {
  // A fixture that fails the schema renders as the empty state, which looks
  // exactly like the mock server not having sent a plan at all.
  it.each(Object.keys(queryPlanFixtures))('%s is a valid query plan', name => {
    const result = QueryPlanSchema.safeParse(queryPlanFixtures[name]);

    expect(result.success ? null : result.error.issues).toBeNull();
  });

  it('covers every node kind the renderers handle', () => {
    const kinds = collectKinds(Object.values(queryPlanFixtures));

    expect([...kinds].sort()).toEqual(
      expect.arrayContaining([
        'BatchFetch',
        'Condition',
        'Defer',
        'Fetch',
        'Flatten',
        'Parallel',
        'Sequence',
        'Subscription',
      ]),
    );
  });
});

describe('resolveQueryPlanFixture', () => {
  it('sends no plan when the header is absent or switched off', () => {
    expect(resolveQueryPlanFixture(null)).toBeNull();
    expect(resolveQueryPlanFixture('none')).toBeNull();
  });

  it('selects a fixture by name', () => {
    expect(resolveQueryPlanFixture('parallel')).toBe(queryPlanFixtures.parallel);
  });

  it('injects raw JSON verbatim so a captured plan can be reproduced', () => {
    const plan = { kind: 'QueryPlan', node: { kind: 'Parallel', nodes: [] } };

    expect(resolveQueryPlanFixture(JSON.stringify(plan))).toEqual(plan);
  });

  it('falls back rather than silently sending nothing for an unknown name', () => {
    expect(resolveQueryPlanFixture('typo')).toBe(queryPlanFixtures.simple);
    expect(resolveQueryPlanFixture('{ not json')).toBeNull();
  });
});
