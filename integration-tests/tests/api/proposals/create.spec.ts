import { graphql } from 'testkit/gql';
import { ProjectType, ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';

const CreateProposalMutation = graphql(`
  mutation CreateProposalMutation($input: CreateSchemaProposalInput!) {
    createSchemaProposal(input: $input) {
      ok {
        schemaProposal {
          id
        }
      }
      error {
        message
      }
    }
  }
`);

describe('Schema Proposals', () => {
  test.concurrent(
    'cannot be proposed without "schemaProposal:modify" permission',
    async ({ expect }) => {
      const { createOrg, ownerToken } = await initSeed().createOwner();
      const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
      await setFeatureFlag('schemaProposals', true);
      const { target } = await createProject(ProjectType.Federation);
      const { privateAccessKey: accessKey } = await createOrganizationAccessToken(
        {
          resources: {
            mode: ResourceAssignmentModeType.All,
          },
          permissions: ['schemaProposal:describe'],
        },
        ownerToken,
      );

      const result = await execute({
        document: CreateProposalMutation,
        variables: {
          input: {
            target: { byId: target.id },
            author: 'Jeff',
            title: 'Proposed changes to the schema...',
          },
        },
        authToken: accessKey,
      }).then(r => r.expectGraphQLErrors());
    },
  );

  test.concurrent(
    'can be proposed successfully with "schemaProposal:modify" permission',
    async ({ expect }) => {
      const { createOrg, ownerToken } = await initSeed().createOwner();
      const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
      await setFeatureFlag('schemaProposals', true);
      const { target } = await createProject(ProjectType.Federation);

      const { privateAccessKey: accessKey } = await createOrganizationAccessToken({
        resources: {
          mode: ResourceAssignmentModeType.All,
        },
        permissions: ['schemaProposal:modify'],
      });

      const result = await execute({
        document: CreateProposalMutation,
        variables: {
          input: {
            target: { byId: target.id },
            author: 'Jeff',
            title: 'Proposed changes to the schema...',
          },
        },
        authToken: accessKey,
      }).then(r => r.expectNoGraphQLErrors());

      expect(result.createSchemaProposal.ok?.schemaProposal).toHaveProperty('id');
    },
  );
});
