import { graphql } from '../../testkit/gql';
import { ProjectType, ResourceSelectorIntentType } from '../../testkit/gql/graphql';
import { execute } from '../../testkit/graphql';
import { initSeed } from '../../testkit/seed';

const IntegrationTests_ResourceSelector_OrganizationProjectTargetQuery = graphql(`
  query IntegrationTests_ResourceSelector_OrganizationProjectTargetQuery(
    $intent: ResourceSelectorIntentType!
    $organizationId: ID!
    $projectId: ID!
    $targetId: ID!
  ) {
    organization(reference: { byId: $organizationId }) {
      id
      projectForResourceSelector(projectId: $projectId, intent: $intent) {
        projectId
        slug
        target(targetId: $targetId) {
          appDeployments
          services
          slug
          targetId
        }
        type
      }
    }
  }
`);

test.concurrent(
  'can successfully query latest services and app deployments',
  async ({ expect }) => {
    const { createOrg, ownerToken } = await initSeed().createOwner();
    const { organization, createProject } = await createOrg();
    const { project, target, createTargetAccessToken } = await createProject(
      ProjectType.Federation,
    );
    const readWriteToken = await createTargetAccessToken({});

    await readWriteToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    const result = await execute({
      document: IntegrationTests_ResourceSelector_OrganizationProjectTargetQuery,
      variables: {
        intent: ResourceSelectorIntentType.Admin,
        organizationId: organization.id,
        projectId: project.id,
        targetId: target.id,
      },
      authToken: ownerToken,
    }).then(res => res.expectNoGraphQLErrors());

    expect(result).toMatchObject({
      organization: {
        id: organization.id,
        projectForResourceSelector: {
          projectId: project.id,
          target: {
            appDeployments: [],
            services: ['a'],
            slug: 'production',
            targetId: target.id,
          },
          type: 'FEDERATION',
        },
      },
    });
  },
);

test.concurrent(
  'can not perform "Insecure Direct Object Reference" by providing a different project id',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, project, createTargetAccessToken } = await createProject(
      ProjectType.Federation,
    );
    const readWriteToken = await createTargetAccessToken({});

    await readWriteToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    const { createOrg: createOrgForOtherOwner, ownerToken } = await initSeed().createOwner();
    const { organization: otherOrganization, createProject: createProjectInOtherOrg } =
      await createOrgForOtherOwner();
    const { project: otherProject } = await createProjectInOtherOrg(ProjectType.Federation);

    const result = await execute({
      document: IntegrationTests_ResourceSelector_OrganizationProjectTargetQuery,
      variables: {
        intent: ResourceSelectorIntentType.Admin,
        organizationId: otherOrganization.id,
        projectId: project.id,
        targetId: target.id,
      },
      authToken: ownerToken,
    }).then(res => res.expectNoGraphQLErrors());

    expect(result).toMatchObject({
      organization: {
        id: otherOrganization.id,
        projectForResourceSelector: null,
      },
    });
  },
);

test.concurrent(
  'can not perform "Insecure Direct Object Reference" by providing a random target id',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);
    const readWriteToken = await createTargetAccessToken({});

    await readWriteToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
        service: 'a',
        url: 'http://localhost',
      })
      .then(r => r.expectNoGraphQLErrors());

    const { createOrg: createOrgForOtherOwner, ownerToken } = await initSeed().createOwner();
    const { organization: otherOrganization, createProject: createProjectInOtherOrg } =
      await createOrgForOtherOwner();
    const { project: otherProject } = await createProjectInOtherOrg(ProjectType.Federation);

    const result = await execute({
      document: IntegrationTests_ResourceSelector_OrganizationProjectTargetQuery,
      variables: {
        intent: ResourceSelectorIntentType.Admin,
        organizationId: otherOrganization.id,
        projectId: otherProject.id,
        targetId: target.id,
      },
      authToken: ownerToken,
    }).then(res => res.expectNoGraphQLErrors());

    expect(result).toMatchObject({
      organization: {
        id: otherOrganization.id,
        projectForResourceSelector: {
          projectId: otherProject.id,
          // if this is not null we got a problem
          target: null,
          type: 'FEDERATION',
        },
      },
    });
  },
);
