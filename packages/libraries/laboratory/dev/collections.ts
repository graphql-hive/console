/**
 * Seed collections for the dev harness, applied by src/main.tsx on every load. They
 * target the mock endpoint's schema (the repo root schema.graphql) and are chosen to
 * exercise the states that are otherwise fiddly to reach by hand: query plans,
 * diagnostics, large responses and template substitution.
 */
import type { LaboratoryCollection } from '../src/lib/collections';

const CREATED_AT = '2026-01-01T00:00:00.000Z';

const operation = (
  id: string,
  name: string,
  query: string,
  extras: { description?: string; variables?: string; headers?: string } = {},
) => ({
  id,
  name,
  description: extras.description ?? '',
  query,
  variables: extras.variables ?? '',
  headers: extras.headers ?? '',
  extensions: '',
  createdAt: CREATED_AT,
});

export const devCollections: LaboratoryCollection[] = [
  {
    id: 'dev-basics',
    name: 'Basics',
    description: 'Small requests for checking the response panel',
    createdAt: CREATED_AT,
    operations: [
      operation(
        'dev-basics-me',
        'Me',
        `query Me {
  me {
    id
    displayName
    email
  }
}`,
        { description: 'A tiny response, for the size badge in bytes' },
      ),
      operation(
        'dev-basics-deep',
        'Deeply nested',
        `query DeeplyNested {
  organizations {
    nodes {
      id
      slug
      owner {
        id
        user {
          displayName
          email
        }
      }
    }
  }
}`,
        { description: 'Five levels deep, for expanding the builder past the document' },
      ),
    ],
  },
  {
    id: 'dev-query-plans',
    name: 'Query plans',
    description: 'One per node kind, via the x-query-plan header',
    createdAt: CREATED_AT,
    operations: [
      operation('dev-plan-simple', 'Simple plan', `query SimplePlan {\n  me {\n    id\n  }\n}`, {
        description: 'Sequence of a Fetch and a Flatten',
        headers: `{ "x-query-plan": "simple" }`,
      }),
      operation('dev-plan-deep', 'Wide plan', `query WidePlan {\n  me {\n    id\n  }\n}`, {
        description: 'Six parallel branches, for the visual tree layout',
        headers: `{ "x-query-plan": "deep" }`,
      }),
      operation('dev-plan-defer', 'Defer plan', `query DeferPlan {\n  me {\n    id\n  }\n}`, {
        description: 'A Defer node with one primary and one deferred branch',
        headers: `{ "x-query-plan": "defer" }`,
      }),
      operation('dev-plan-none', 'No plan', `query NoPlan {\n  me {\n    id\n  }\n}`, {
        description: 'No header, so the Query Plan tab shows its empty state',
      }),
    ],
  },
  {
    id: 'dev-diagnostics',
    name: 'Diagnostics',
    description: 'Deliberately invalid, for squiggles and hovers',
    createdAt: CREATED_AT,
    operations: [
      operation(
        'dev-diagnostics-field',
        'Unknown field',
        `query UnknownField {
  billingPlans {
    basePrice
    descriptions
  }
}`,
        { description: 'Hovering "descriptions" should suggest "description"' },
      ),
      operation(
        'dev-diagnostics-variable',
        'Undeclared variable',
        `query UndeclaredVariable {
  billingPlans {
    basePrice
  }
}`,
        {
          description: 'The variables editor should mark basePrice as not allowed',
          variables: `{ "basePrice": 213 }`,
        },
      ),
    ],
  },
  {
    id: 'dev-templates',
    name: 'Templates',
    description: 'Header and variable substitution, also visible in copy as cURL',
    createdAt: CREATED_AT,
    operations: [
      operation(
        'dev-templates-env',
        'Env substitution',
        `query EnvSubstitution($selector: TargetSelectorInput!) {
  lab(selector: $selector) {
    schema
  }
}`,
        {
          description: 'Set token in the Env tab, then copy as cURL to see it applied',
          headers: `{ "authorization": "Bearer {{token}}" }`,
          variables: `{
  "selector": {
    "organizationSlug": "the-guild",
    "projectSlug": "graphql-hive",
    "targetSlug": "production"
  }
}`,
        },
      ),
    ],
  },
];
