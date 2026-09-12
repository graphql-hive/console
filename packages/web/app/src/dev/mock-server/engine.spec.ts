import type { GraphQLSchema } from 'graphql';
import { MOCK_USER } from '@/dev/mock-user';
import { scenarios, type Scenario } from '@/dev/scenarios';
import { WORLD } from '@/dev/world';
import { createMockEngine } from './engine';
import { loadPersistedOperations } from './persisted-operations';
import { plausibleVariables } from './plausible-variables';
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

  test('the project page target list and the breadcrumb tree agree', async () => {
    // The project page lists targets via Query.targets(selector); the breadcrumb walks
    // organizations -> projects -> targets. A target reached from one must exist in the other.
    const result = await engineFor(scenarios.default).execute({
      query: `query($s: ProjectSelectorInput!) {
        targets(selector: $s) { edges { node { id slug } } }
        organizations { nodes { slug projects { edges { node { slug targets { edges { node { id slug } } } } } } } }
      }`,
      variables: { s: { organizationSlug: 'acme', projectSlug: 'api' } },
    });
    const data = result.data as any;
    const fromRoot = data.targets.edges.map((e: any) => e.node);
    const fromTree = data.organizations.nodes
      .find((o: any) => o.slug === 'acme')
      .projects.edges.find((e: any) => e.node.slug === 'api')
      .node.targets.edges.map((e: any) => e.node);

    expect(fromRoot.map((t: any) => t.slug)).toEqual(WORLD.targets.map(t => t.slug));
    expect(fromTree).toEqual(fromRoot);
  });

  test('the latest schema version is valid by default, so no outdated-schema banner', async () => {
    const result = await engineFor(scenarios.default).execute({
      query: `query($s: TargetSelectorInput!) {
        target(reference: { bySelector: $s }) {
          latestSchemaVersion { id isComposable }
          latestValidSchemaVersion { id }
        }
        latestValidVersion(target: { bySelector: $s }) { id }
      }`,
      variables: { s: selector },
    });
    const data = result.data as any;

    expect(data.target.latestSchemaVersion.isComposable).toBe(true);
    expect(data.target.latestValidSchemaVersion.id).toBe(data.target.latestSchemaVersion.id);
    expect(data.latestValidVersion.id).toBe(data.target.latestSchemaVersion.id);
  });

  test('a field pin beats a base consistency resolver', async () => {
    const result = await engineFor({
      ...scenarios.default,
      fields: { 'Target.latestValidSchemaVersion': null },
    }).execute({
      query: `query($s: TargetSelectorInput!) {
        target(reference: { bySelector: $s }) { latestSchemaVersion { id } latestValidSchemaVersion { id } }
      }`,
      variables: { s: selector },
    });
    const data = result.data as any;

    expect(data.target.latestSchemaVersion).not.toBeNull();
    expect(data.target.latestValidSchemaVersion).toBeNull();
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

  describe('named scenarios', () => {
    test('support-with-tickets serves the fixture through the real support pages', async () => {
      const engine = engineFor(scenarios['support-with-tickets']);

      const list = await engine.execute({
        query: persisted('SupportPageQuery'),
        variables: { organizationSlug: 'acme' },
      });
      const tickets = (list.data as any).organization.supportTickets.edges.map((e: any) => e.node);

      expect(list.errors).toBeUndefined();
      expect(tickets).toHaveLength(8);
      expect(new Set(tickets.map((t: any) => t.status))).toEqual(new Set(['OPEN', 'SOLVED']));

      const detail = await engine.execute({
        query: persisted('SupportTicketPageQuery'),
        variables: { organizationSlug: 'acme', ticketId: tickets[0].id },
      });
      const ticket = (detail.data as any).organization.supportTicket;

      expect(detail.errors).toBeUndefined();
      expect(ticket.id).toBe(tickets[0].id);
      expect(ticket.subject).toBe(tickets[0].subject);
      expect(ticket.comments.edges).toHaveLength(3);
    });

    test('empty-org has nothing to show', async () => {
      const result = await engineFor(scenarios['empty-org']).execute({
        query: `query($s: TargetSelectorInput!) {
          hasCollectedOperations(selector: $s)
          organizationBySlug(organizationSlug: "acme") {
            projects { edges { node { id } } }
            supportTickets { edges { node { id } } }
            getStarted { creatingProject publishingSchema }
          }
          target(reference: { bySelector: $s }) { hasSchema latestSchemaVersion { id } }
        }`,
        variables: { s: selector },
      });
      const data = result.data as any;

      expect(result.errors).toBeUndefined();
      expect(data.hasCollectedOperations).toBe(false);
      expect(data.organizationBySlug.projects.edges).toEqual([]);
      expect(data.organizationBySlug.supportTickets.edges).toEqual([]);
      expect(data.organizationBySlug.getStarted).toEqual({
        creatingProject: false,
        publishingSchema: false,
      });
      expect(data.target.hasSchema).toBe(false);
      expect(data.target.latestSchemaVersion).toBeNull();
    });

    test('outdated-schema makes the latest version distinct from, and less valid than, the last valid one', async () => {
      const result = await engineFor(scenarios['outdated-schema']).execute({
        query: `query($s: TargetSelectorInput!) {
          target(reference: { bySelector: $s }) {
            latestSchemaVersion { id isComposable isValid }
            latestValidSchemaVersion { id isComposable isValid }
          }
        }`,
        variables: { s: selector },
      });
      const { latestSchemaVersion: latest, latestValidSchemaVersion: valid } = (result.data as any)
        .target;

      expect(result.errors).toBeUndefined();
      expect(latest.id).not.toBe(valid.id);
      expect(latest).toMatchObject({ isComposable: false, isValid: false });
      expect(valid).toMatchObject({ isComposable: true, isValid: true });
    });

    test('over-quota raises the billing warnings', async () => {
      const result = await engineFor(scenarios['over-quota']).execute({
        query: `query {
          organizationBySlug(organizationSlug: "acme") {
            isMonthlyOperationsLimitExceeded
            billingConfiguration { hasPaymentIssues }
            rateLimit { limitedForOperations }
          }
        }`,
      });
      const org = (result.data as any).organizationBySlug;

      expect(org.isMonthlyOperationsLimitExceeded).toBe(true);
      expect(org.billingConfiguration.hasPaymentIssues).toBe(true);
      expect(org.rateLimit.limitedForOperations).toBe(true);
    });

    test('read-only-member closes every gate and drops owner and admin status', async () => {
      const engine = engineFor(scenarios['read-only-member']);
      const layout = await engine.execute({
        query: persisted('TargetLayoutQuery'),
        variables: selector,
      });
      const who = await engine.execute({
        query:
          'query { me { isAdmin } organizationBySlug(organizationSlug: "acme") { me { isOwner } } }',
      });
      const data = who.data as any;

      expect(new Set(Object.values(collectViewerCan(layout.data)))).toEqual(new Set([false]));
      expect(data.me.isAdmin).toBe(false);
      expect(data.organizationBySlug.me.isOwner).toBe(false);
    });

    // Six engines times every operation: about 1.3s idle, so give it room on a loaded CI runner.
    test('every scenario still serves every persisted operation', { timeout: 20_000 }, async () => {
      const ops = loadPersistedOperations().filter(op => op.kind !== 'subscription');

      for (const scenario of Object.values(scenarios)) {
        const engine = engineFor(scenario);
        for (const op of ops) {
          const result = await engine.execute({
            query: op.source,
            operationName: op.name,
            variables: plausibleVariables(engine.schema, op.operation),
          });
          expect(result.errors, `${scenario.name}: ${op.name}`).toBeUndefined();
        }
      }
    });
  });
});
