import { parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { createTestClient, missingSelections, type Fixtures } from './urql';

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

const ProjectQuery = parse(`query ProjectQuery { project { id name } }`);

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
      project: { id: 'p', name: String(variables.n) },
    }));
    const client = createTestClient(fixtures);

    const organization = await client
      .query(OrganizationQuery, { organizationSlug: 'o', minimal: false })
      .toPromise();
    const project = await client.query(ProjectQuery, { n: 1 }).toPromise();
    const unknown = await client.query(parse(`query Unknown { me { id } }`), {}).toPromise();

    expect(organization.data).toEqual({ me: null, organization: null });
    expect(project.data).toEqual({ project: { id: 'p', name: '1' } });
    expect(unknown.data).toBeUndefined();
    expect(unknown.error).toBeUndefined();
    expect(client.seen).toEqual(['OrganizationQuery', 'ProjectQuery', 'Unknown']);
  });

  it('throws when a fixture does not cover its query', async () => {
    const client = createTestClient(
      new Map<string, unknown>([['ProjectQuery', { project: { id: 'p' } }]]),
    );
    await expect(client.query(ProjectQuery, {}).toPromise()).rejects.toThrow(
      'Fixture for ProjectQuery does not cover its query; missing: project.name',
    );
  });
});
