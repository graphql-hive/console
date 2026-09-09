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
    id: 'dev-op-subscription',
    name: 'Subscription',
    query: `# Streams three events, then completes. Switch the transport under
# Settings > Subscriptions > Protocol; the mock serves them all.
subscription OidcLog {
  oidcIntegrationLog(input: { oidcIntegrationId: "dev" }) {
    message
    timestamp
  }
}`,
    variables: '',
    headers: '',
    extensions: '',
  },
  {
    id: 'dev-op-union-expansion',
    name: 'Union expansion',
    query: `# tokenInfo is a union one level down from the root, so the builder opens on
# it. It has a chevron and a "... on" row per member, where it used to render as
# a leaf. The __typename below is what ticking an abstract field now writes on
# its own; untick tokenInfo and tick it again to watch that happen. Run works.
query UnionExpansion {
  tokenInfo {
    __typename
  }
}`,
    variables: '',
    headers: '',
    extensions: '',
  },
  {
    id: 'dev-op-interface-expansion',
    name: 'Interface expansion',
    query: `# schemaCheck is an interface. Its own fields render directly, with
# "... on FailedSchemaCheck" and "... on SuccessfulSchemaCheck" below them
# carrying only what each implementation adds, so there is no second id row.
# The arguments are filled in so the document validates; it is not meant to run.
query InterfaceExpansion($target: TargetReferenceInput!, $checkId: ID!) {
  target(reference: $target) {
    schemaCheck(id: $checkId) {
      __typename
      id
    }
  }
}`,
    variables: '',
    headers: '',
    extensions: '',
  },
  {
    id: 'dev-op-shared-field-names',
    name: 'Shared field names',
    query: `# CompositeSchema and SingleSchema both declare id, author, commit, date,
# metadata and source. Only the CompositeSchema branch is selected here, so on
# load exactly one of the two id rows is ticked. Expand
# latestValidVersion > schemas > edges > node in the builder to see both.
query SharedFieldNames {
  latestValidVersion {
    schemas {
      edges {
        node {
          __typename
          ... on CompositeSchema {
            id
            service
          }
        }
      }
    }
  }
}`,
    variables: '',
    headers: '',
    extensions: '',
  },
  {
    id: 'dev-op-legacy-fragments',
    name: 'Legacy fragments',
    query: `# A document the builder did not write: a hand-placed __typename, an inline
# fragment, and a named fragment spread the builder does not manage. The tree
# should expand to the fragment rows on load, and unticking url below
# "... on CompositeSchema" must leave a document that still parses rather than a
# bare "... on CompositeSchema". The spread must survive untouched.
query LegacyFragments {
  latestValidVersion {
    schemas {
      edges {
        node {
          __typename
          ... on CompositeSchema {
            url
          }
          ...SchemaFields
        }
      }
    }
  }
}

fragment SchemaFields on CompositeSchema {
  commit
}`,
    variables: '',
    headers: '',
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

/** The tab surfacing a seeded operation, so a preview can open one by name. */
export const devTabIdFor = (operationId: string) => `dev-tab-${operationId}`;

export const devTabs: LaboratoryTab[] = devOperations.map(operation => ({
  id: devTabIdFor(operation.id),
  type: 'operation',
  data: { id: operation.id, name: operation.name },
}));

export const devActiveTabId = devTabIdFor('dev-op-query-plan');
