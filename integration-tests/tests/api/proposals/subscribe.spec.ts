import { graphql } from 'testkit/gql';
import { ProjectType, ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { execute, subscribe } from 'testkit/graphql';
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

const ProposalCompositionSubscription = graphql(`
  subscription ProposalCompositionSubscription(
    $input: SchemaProposalCompositionSubscriptionInput!
  ) {
    schemaProposalComposition(input: $input) {
      status
      timestamp
    }
  }
`);

/**
 * Creates a proposal and returns a token with specified permissions
 **/
async function setup(input: { tokenPermissions: string[] }) {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
  await setFeatureFlag('schemaProposals', true);
  const project = await createProject(ProjectType.Federation);

  // create as owner
  const result = await execute({
    document: CreateProposalMutation,
    variables: {
      input: {
        target: { byId: project.target.id },
        author: 'Jeff',
        title: 'Proposed changes to the schema...',
      },
    },
    token: ownerToken,
  }).then(r => r.expectNoGraphQLErrors());

  const { privateAccessKey: accessKey } = await createOrganizationAccessToken(
    {
      resources: {
        mode: ResourceAssignmentModeType.All,
      },
      permissions: input.tokenPermissions,
    },
    ownerToken,
  );
  const proposalId = result.createSchemaProposal.ok?.schemaProposal.id!;
  return { accessKey, proposalId, project };
}

describe('Schema Proposals', () => {
  test.concurrent(
    'can subscribe for proposal events with "schemaProposal:describe" permission',
    async ({ expect }) => {
      const { accessKey, proposalId, project } = await setup({
        tokenPermissions: ['schemaProposal:describe'],
      });

      const query = await subscribe({
        document: ProposalCompositionSubscription,
        variables: {
          input: {
            proposalId,
          },
        },
        token: accessKey,
      });

      // create the schema check to trigger the composition and subscription event
      const token = await project.createTargetAccessToken({ mode: 'readWrite' });
      await token.publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            ping: String
          }
        `,
        service: 'example',
        url: 'http://localhost:4001',
      });
      const checkResultErrors = await token
        .checkSchema(
          /* GraphQL */ `
            type Query {
              ping: String
              pong: String
            }
          `,
          'example',
          undefined,
          undefined,
          proposalId,
        )
        .then(r => r.expectNoGraphQLErrors());
      expect(checkResultErrors.schemaCheck.__typename).toBe(`SchemaCheckSuccess`);
      const { value } = await query.next();
      expect(value.data.schemaProposalComposition.status).toBe(`SUCCESS`);
      await expect(query.return?.()).resolves.toMatchObject({ done: true });
    },
  );
});
