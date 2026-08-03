/**
 * Seed operations (and the tabs that surface them) for the dev harness, applied by
 * src/main.tsx on every load. Operations are only reachable through a tab, so each
 * one here is paired with a tab and the lab boots with them open.
 *
 * They exist so headers are visible without opening a collection first; the query
 * plan fixtures in dev/query-plan-fixtures.ts are driven purely by a request header.
 */
import type { LaboratoryOperation } from '../src/lib/operations';
import type { LaboratoryTab } from '../src/lib/tabs';

export const devOperations: LaboratoryOperation[] = [
  {
    id: 'dev-op-me',
    name: 'Me',
    query: `# Baseline: no headers, small response.
query Me {
  me {
    id
    displayName
    email
  }
}`,
    variables: '',
    headers: '',
    extensions: '',
  },
  {
    id: 'dev-op-query-plan',
    name: 'Query plan',
    query: `# Run, then open Query Plan. The x-query-plan header picks the fixture.
query SimplePlan {
  me {
    id
  }
}`,
    variables: '',
    headers: `{
  "x-query-plan": "simple"
}`,
    extensions: '',
  },
  {
    id: 'dev-op-defer-plan',
    name: 'Defer plan',
    query: `# Plan tree with a Defer node: one primary branch, one deferred.
query DeferPlan {
  me {
    id
  }
}`,
    variables: '',
    headers: `{
  "x-query-plan": "defer"
}`,
    extensions: '',
  },
];

export const devTabs: LaboratoryTab[] = devOperations.map(operation => ({
  id: `dev-tab-${operation.id}`,
  type: 'operation',
  data: { id: operation.id, name: operation.name },
}));

export const devActiveTabId = 'dev-tab-dev-op-query-plan';
