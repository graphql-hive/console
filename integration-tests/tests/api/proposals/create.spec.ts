import { createSchemaProposal } from 'testkit/flow';
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

  test.concurrent(
    'Mutation.createSchemaProposal: title and description invalid',
    async ({ expect }) => {
      const { createOrg, ownerToken } = await initSeed().createOwner();
      const { createProject, setFeatureFlag } = await createOrg();
      await setFeatureFlag('schemaProposals', true);
      const { target } = await createProject(ProjectType.Federation);

      const empty = await createSchemaProposal(
        { target: { byId: target.id }, author: 'Jeff', title: '' },
        ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(empty.createSchemaProposal.error).toMatchInlineSnapshot(`
      {
        details: {
          description: null,
          title: Must be at least 1 character long,
        },
        message: Invalid input,
      }
    `);

      const tooLong = await createSchemaProposal(
        {
          target: { byId: target.id },
          author: 'Jeff',
          title: 'a'.repeat(65),
          description: 'b'.repeat(1025),
        },
        ownerToken,
      ).then(r => r.expectNoGraphQLErrors());
      expect(tooLong.createSchemaProposal.error).toMatchInlineSnapshot(`
      {
        details: {
          description: Must be at most 1024 characters long,
          title: Must be at most 64 characters long,
        },
        message: Invalid input,
      }
    `);
    },
  );
});
