/**
 * Query plans for exercising the Query Plan panel in development.
 *
 * Pick one with the `x-query-plan` header on a request, e.g. `x-query-plan: parallel`.
 * Omitting the header is the empty state. Passing raw JSON injects it verbatim.
 *
 * Between them these cover all eight node kinds the renderers handle
 * (see renderQueryPlan and QueryPlanTree in src/lib/query-plan/utils.tsx).
 */
import type { QueryPlan } from '../src/lib/query-plan/schema';

const fetchNode = (serviceName: string, operation: string) => ({
  kind: 'Fetch' as const,
  serviceName,
  operationKind: 'query',
  operation,
});

const simple: QueryPlan = {
  kind: 'QueryPlan',
  node: {
    kind: 'Sequence',
    nodes: [
      fetchNode('accounts', '{ me { id } }'),
      {
        kind: 'Flatten',
        path: [{ Field: 'me' }],
        node: fetchNode('organizations', 'query($id: ID!) { organization(id: $id) { name } }'),
      },
    ],
  },
};

const parallel: QueryPlan = {
  kind: 'QueryPlan',
  node: {
    kind: 'Parallel',
    nodes: [
      fetchNode('accounts', '{ me { id displayName } }'),
      fetchNode('billing', '{ billingPlans { id basePrice } }'),
      fetchNode('targets', '{ targets { id slug } }'),
    ],
  },
};

const condition: QueryPlan = {
  kind: 'QueryPlan',
  node: {
    kind: 'Condition',
    condition: 'withDetails',
    ifClause: fetchNode('organizations', '{ organization { id name owner { id } } }'),
    elseClause: fetchNode('organizations', '{ organization { id } }'),
  },
};

const subscription: QueryPlan = {
  kind: 'QueryPlan',
  node: {
    kind: 'Subscription',
    primary: fetchNode('alerts', 'subscription { alertTriggered { id severity } }'),
  },
};

const batch: QueryPlan = {
  kind: 'QueryPlan',
  node: {
    kind: 'BatchFetch',
    serviceName: 'schema',
    operationKind: 'query',
    operation: 'query($representations: [_Any!]!) { _entities(representations: $representations) }',
    entityBatch: {
      aliases: [
        {
          alias: 'target',
          representationsVariableName: 'representations',
          paths: [[{ Field: 'targets' }, '@']],
          requires: [{ kind: 'Field', name: 'id' }],
        },
      ],
    },
  },
};

const defer: QueryPlan = {
  kind: 'QueryPlan',
  node: {
    kind: 'Defer',
    primary: {
      subselection: '{ organization { id name } }',
      node: fetchNode('organizations', '{ organization { id name } }'),
    },
    deferred: [
      {
        depends: [{ id: 'organization', deferLabel: 'members' }],
        label: 'members',
        queryPath: ['organization', 'members'],
        subselection: '{ members { nodes { id } } }',
        node: fetchNode('accounts', '{ members { nodes { id displayName } } }'),
      },
    ],
  },
};

/** Wide and deep, to stress the visual tree's layout rather than its renderers. */
const deep: QueryPlan = {
  kind: 'QueryPlan',
  node: {
    kind: 'Sequence',
    nodes: [
      fetchNode('gateway', '{ __typename }'),
      {
        kind: 'Parallel',
        nodes: Array.from({ length: 6 }, (_, index) => ({
          kind: 'Flatten' as const,
          path: [{ Field: `branch${index}` }],
          node: {
            kind: 'Sequence' as const,
            nodes: [
              fetchNode(`service-${index}`, `{ branch${index} { id } }`),
              {
                kind: 'Flatten' as const,
                path: [{ Field: `branch${index}` }, { Field: 'nested' }],
                node: fetchNode(`service-${index}-nested`, `{ nested${index} { id name } }`),
              },
            ],
          },
        })),
      },
    ],
  },
};

export const queryPlanFixtures: Record<string, QueryPlan> = {
  simple,
  parallel,
  condition,
  subscription,
  batch,
  defer,
  deep,
};

export const resolveQueryPlanFixture = (header: string | null): QueryPlan | null => {
  if (!header || header === 'none' || header === 'false') {
    return null;
  }

  if (header in queryPlanFixtures) {
    return queryPlanFixtures[header];
  }

  // Anything JSON-shaped is injected as-is, for reproducing a captured plan.
  if (header.trimStart().startsWith('{')) {
    try {
      return JSON.parse(header) as QueryPlan;
    } catch {
      return null;
    }
  }

  return queryPlanFixtures.simple;
};
