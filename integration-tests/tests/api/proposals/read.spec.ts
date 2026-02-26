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

const ReadProposalQuery = graphql(`
  query ReadProposalQuery($input: SchemaProposalInput!) {
    schemaProposal(input: $input) {
      title
      description
      checks(input: { latestPerService: true }) {
        edges {
          node {
            id
          }
        }
      }
    }
  }
`);

/**
 * Creates a proposal and returns a token with specified permissions
 **/
async function setup(input: {
  tokenPermissions: string[];
}): Promise<{ accessKey: string; proposalId: string }> {
  const { createOrg, ownerToken } = await initSeed().createOwner();
  const { createProject, createOrganizationAccessToken, setFeatureFlag } = await createOrg();
  await setFeatureFlag('schemaProposals', true);
  const { target } = await createProject(ProjectType.Federation);

  // create as owner
  const result = await execute({
    document: CreateProposalMutation,
    variables: {
      input: {
        target: { byId: target.id },
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
  return { accessKey, proposalId };
}

describe('Schema Proposals', () => {
  test.concurrent(
    'can read proposal with "schemaProposal:describe" permission',
    async ({ expect }) => {
      const { accessKey, proposalId } = await setup({
        tokenPermissions: ['schemaProposal:describe'],
      });

      {
        const proposal = await execute({
          document: ReadProposalQuery,
          variables: {
            input: {
              id: proposalId,
            },
          },
          token: accessKey,
        }).then(r => r.expectNoGraphQLErrors());

        expect(proposal.schemaProposal?.title).toMatchInlineSnapshot(
          `Proposed changes to the schema...`,
        );
      }
    },
  );

  test.concurrent('cannot read proposal without "schemaProposal:describe" permission', async () => {
    const { accessKey, proposalId } = await setup({ tokenPermissions: [] });

    {
      await execute({
        document: ReadProposalQuery,
        variables: {
          input: {
            id: proposalId,
          },
        },
        token: accessKey,
      }).then(r => r.expectGraphQLErrors());
    }
  });
});
