// @vitest-environment jsdom
import { parse } from 'graphql';
import { createTestClient, missingSelections, type Fixtures } from './urql';

// The cache config imports the updaters, which import pages; these stand in for what cannot load here.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

const OrganizationQuery = parse(`
  query OrganizationQuery($organizationSlug: String!, $minimal: Boolean!) {
    me { id ...Viewer }
    organization: organizationBySlug(organizationSlug: $organizationSlug) @skip(if: $minimal) {
      id
      projects { edges { node { id slug } } }
    }
  }
  fragment Viewer on User { email }
`);

const ProjectQuery = parse('query ProjectQuery($n: Int) { organizations { nodes { id slug } } }');

describe('missingSelections', () => {
  it('accepts data that covers every selected field, through fragments and lists', () => {
    const data = {
      me: { id: 'u', email: 'user@the-guild.dev' },
      organization: {
        id: 'o',
        projects: { edges: [{ node: { id: 'p', slug: 'gateway' } }] },
      },
    };
    expect(missingSelections(OrganizationQuery, data, { minimal: false })).toEqual([]);
  });

  it('names the paths a fixture no longer provides', () => {
    const data = {
      me: { id: 'u' },
      organization: { id: 'o', projects: { edges: [{ node: { id: 'p' } }] } },
    };
    expect(missingSelections(OrganizationQuery, data, { minimal: false })).toEqual([
      'me.email',
      'organization.projects.edges[0].node.slug',
    ]);
  });

  it('does not demand a field the variables skip, and treats null as covered', () => {
    expect(missingSelections(OrganizationQuery, { me: null }, { minimal: true })).toEqual([]);
  });
});

describe('createTestClient', () => {
  it('answers each operation from its own fixture and leaves unknown ones without data', async () => {
    const fixtures: Fixtures = new Map();
    fixtures.set('OrganizationQuery', { me: null, organization: null });
    fixtures.set('ProjectQuery', (variables: Record<string, unknown>) => ({
      organizations: {
        __typename: 'OrganizationConnection',
        nodes: [{ __typename: 'Organization', id: 'p', slug: String(variables.n) }],
      },
    }));
    const client = createTestClient(fixtures);

    const organization = await client
      .query(OrganizationQuery, { organizationSlug: 'o', minimal: false })
      .toPromise();
    const project = await client.query(ProjectQuery, { n: 1 }).toPromise();
    const unknown = await client.query(parse('query Unknown { isCDNEnabled }'), {}).toPromise();

    expect(organization.data).toMatchObject({ me: null, organization: null });
    expect(project.data).toMatchObject({ organizations: { nodes: [{ id: 'p', slug: '1' }] } });
    expect(unknown.data).toBeUndefined();
    expect(unknown.error).toBeUndefined();
    expect(client.seen).toEqual(['OrganizationQuery', 'ProjectQuery', 'Unknown']);
  });

  it('throws when a fixture does not cover its query', async () => {
    const client = createTestClient(
      new Map<string, unknown>([['ProjectQuery', { organizations: { nodes: [{ id: 'p' }] } }]]),
    );
    await expect(client.query(ProjectQuery, {}).toPromise()).rejects.toThrow(
      'Fixture for ProjectQuery does not cover its query; missing: organizations.nodes[0].slug',
    );
  });

  it('answers an Error fixture with that error, as a failed request would', async () => {
    const client = createTestClient(
      new Map<string, unknown>([['ProjectQuery', new Error('the server is away')]]),
    );
    const result = await client.query(ProjectQuery, {}).toPromise();

    expect(result.data).toBeUndefined();
    expect(result.error?.networkError?.message).toBe('the server is away');
  });

  it('records each operation with its variables and context', async () => {
    const client = createTestClient();
    await client.query(ProjectQuery, { n: 1 }, { preload: true }).toPromise();

    expect(client.operations).toHaveLength(1);
    expect(client.operations[0].variables).toEqual({ n: 1 });
    expect(client.operations[0].context.preload).toBe(true);
  });

  it('holds a promise fixture in flight until it settles', async () => {
    let answer = (_data: unknown) => {};
    const client = createTestClient(
      new Map<string, unknown>([['ProjectQuery', new Promise(resolve => (answer = resolve))]]),
    );
    let settled = false;
    const result = client
      .query(ProjectQuery, {})
      .toPromise()
      .then(value => {
        settled = true;
        return value;
      });

    await Promise.resolve();
    expect(settled).toBe(false);

    answer({
      organizations: {
        __typename: 'OrganizationConnection',
        nodes: [{ __typename: 'Organization', id: 'p', slug: 'shop' }],
      },
    });
    expect((await result).data).toMatchObject({
      organizations: { nodes: [{ id: 'p', slug: 'shop' }] },
    });
  });

  it('answers a promise fixture that does not cover its query with an error', async () => {
    const client = createTestClient(
      new Map<string, unknown>([
        ['ProjectQuery', Promise.resolve({ organizations: { nodes: [{ id: 'p' }] } })],
      ]),
    );
    const result = await client.query(ProjectQuery, {}).toPromise();

    expect(result.data).toBeUndefined();
    expect(result.error?.message).toContain(
      'Fixture for ProjectQuery does not cover its query; missing: organizations.nodes[0].slug',
    );
  });
});
