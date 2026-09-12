import type { GraphQLSchema } from 'graphql';
import { MOCK_USER } from '@/dev/mock-user';
import { scenarios, type Scenario } from '@/dev/scenarios';
import { WORLD } from '@/dev/world';
import { createMockEngine } from './engine';
import { loadPersistedOperations } from './persisted-operations';
import { loadHiveSchema } from './schema';

const selector = { organizationSlug: 'acme', projectSlug: 'api', targetSlug: 'production' };

const persisted = (name: string) => {
  const op = loadPersistedOperations().find(o => o.name === name);
  if (!op) throw new Error(`No persisted operation named ${name}`);
  return op.source;
};

function collectViewerCan(
  value: unknown,
  out: Record<string, unknown> = {},
): Record<string, unknown> {
  if (Array.isArray(value)) {
    for (const item of value) collectViewerCan(item, out);
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (k.startsWith('viewerCan')) out[k] = v;
      else collectViewerCan(v, out);
    }
  }
  return out;
}

describe('createMockEngine', () => {
  let schema: GraphQLSchema;
  const engineFor = (scenario: Scenario) => createMockEngine(schema, scenario);

  beforeAll(async () => {
    schema = await loadHiveSchema();
  });

  test('echoes URL slugs back and opens every viewerCan* gate', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: persisted('TargetLayoutQuery'),
      variables: selector,
    });
    const data = result.data as any;

    expect(result.errors).toBeUndefined();
    // The layout nests project under organization and target under project, so this
    // exercises projectBySlug and targetBySlug parsing the parent's store key.
    expect(data.organization.slug).toBe('acme');
    expect(data.organization.project.slug).toBe('api');
    expect(data.organization.project.target.slug).toBe('production');

    const gates = collectViewerCan(data);
    expect(Object.keys(gates).length).toBeGreaterThan(5);
    expect(new Set(Object.values(gates))).toEqual(new Set([true]));
  });

  test('signs in as the mock user', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: 'query { me { id email displayName } }',
    });

    expect((result.data as any).me).toMatchObject({ id: MOCK_USER.id, email: MOCK_USER.email });
  });

  test('lists the fixed world and lands on its first organization', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: `query {
        organizations { total nodes { slug } }
        myDefaultOrganization { selector { organizationSlug } organization { slug } }
      }`,
    });
    const data = result.data as any;

    expect(data.organizations.nodes.map((o: any) => o.slug)).toEqual(
      WORLD.organizations.map(o => o.slug),
    );
    expect(data.myDefaultOrganization.organization.slug).toBe(WORLD.organizations[0].slug);
    expect(data.myDefaultOrganization.selector.organizationSlug).toBe(WORLD.organizations[0].slug);
  });

  test('returns the same entities and ids across executions', async () => {
    const engine = engineFor(scenarios.default);
    const body = { query: persisted('TargetLayoutQuery'), variables: selector };

    expect(await engine.execute(body)).toEqual(await engine.execute(body));
  });

  test('resolves a previously issued id back to the same entity', async () => {
    const engine = engineFor(scenarios.default);
    const first = await engine.execute({
      query:
        'query($s: OrganizationSelectorInput!) { organization(reference: { bySelector: $s }) { id slug } }',
      variables: { s: { organizationSlug: 'globex' } },
    });
    const { id, slug } = (first.data as any).organization;

    const second = await engine.execute({
      query: 'query($id: ID!) { organization(reference: { byId: $id }) { id slug } }',
      variables: { id },
    });

    expect((second.data as any).organization).toEqual({ id, slug });
  });

  test('applies curated enum defaults', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: `query($s: TargetSelectorInput!) {
        organizationBySlug(organizationSlug: "acme") { plan }
        target(reference: { bySelector: $s }) { fieldLevelMetricsDisplayState }
      }`,
      variables: { s: selector },
    });
    const data = result.data as any;

    expect(data.organizationBySlug.plan).toBe('PRO');
    expect(data.target.fieldLevelMetricsDisplayState).toBe('ON');
  });

  test('keeps warning-shaped booleans off by default', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: `query {
        organizationBySlug(organizationSlug: "acme") {
          isMonthlyOperationsLimitExceeded
          billingConfiguration { hasPaymentIssues }
        }
      }`,
    });
    const org = (result.data as any).organizationBySlug;

    expect(org.isMonthlyOperationsLimitExceeded).toBe(false);
    expect(org.billingConfiguration.hasPaymentIssues).toBe(false);
  });

  test('a scenario can close every viewerCan* gate', async () => {
    const result = await engineFor({ ...scenarios.default, viewerCan: false }).execute({
      query: persisted('TargetLayoutQuery'),
      variables: selector,
    });

    expect(new Set(Object.values(collectViewerCan(result.data)))).toEqual(new Set([false]));
  });

  test('a scenario can pin individual fields', async () => {
    const result = await engineFor({
      ...scenarios.default,
      fields: { 'Organization.isMonthlyOperationsLimitExceeded': true },
    }).execute({
      query:
        'query { organizationBySlug(organizationSlug: "acme") { isMonthlyOperationsLimitExceeded } }',
    });

    expect((result.data as any).organizationBySlug.isMonthlyOperationsLimitExceeded).toBe(true);
  });

  test('mutation results populate ok and null out error', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: persisted('NewTicketForm_SupportTicketCreateMutation'),
      variables: {
        input: {
          organizationSlug: 'acme',
          subject: 'x',
          description: 'x',
          priority: 'NORMAL',
        },
      },
    });
    const payload = (result.data as any).supportTicketCreate;

    expect(result.errors).toBeUndefined();
    expect(payload.error).toBeNull();
    expect(typeof payload.ok.supportTicketId).toBe('string');
  });

  test('schema check ids are unique across the successful and failed variants', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: `query($s: TargetSelectorInput!) {
        target(reference: { bySelector: $s }) {
          schemaChecks(first: 20) { edges { node { __typename id } } }
        }
      }`,
      variables: { s: selector },
    });
    const nodes = (result.data as any).target.schemaChecks.edges.map((e: any) => e.node);
    const ids = nodes.map((n: any) => n.id);

    expect(nodes.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('rejects invalid documents with errors rather than throwing', async () => {
    const engine = engineFor(scenarios.default);

    expect((await engine.execute({ query: '{ nope }' })).errors).toHaveLength(1);
    expect((await engine.execute({ query: '{ me {' })).errors).toHaveLength(1);
  });
});
