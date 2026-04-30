import { pollFor } from 'testkit/flow';
import { graphql } from 'testkit/gql';
import { ProjectType, ResourceAssignmentModeType } from 'testkit/gql/graphql';
import { execute } from 'testkit/graphql';
import { initSeed } from 'testkit/seed';
import { approveProposal, checkSchema, CreateProposalMutation } from './operations';

describe('Schema Proposals', () => {
  test.concurrent(
    'approved a schema proposal changes are flagged by schema checks',
    async ({ expect }) => {
      const { createOrg, ownerToken } = await initSeed().createOwner();
      const { createProject, setFeatureFlag } = await createOrg();
      await setFeatureFlag('schemaProposals', true);
      const { target, createTargetAccessToken } = await createProject(ProjectType.Federation);

      const result = await execute({
        document: CreateProposalMutation,
        variables: {
          input: {
            target: { byId: target.id },
            author: 'Jeff',
            title: 'Proposed changes to the schema...',
          },
        },
        authToken: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      const proposalId = result.createSchemaProposal.ok?.schemaProposal.id!;
      expect(proposalId).toBeDefined();

      const service = 'sample';
      const sdl = `
      type Query {
        example(id: ID!): Example
      }

      type Example {
        id: ID!
        name: String!
      }
    `;
      const writeToken = await createTargetAccessToken({
        mode: 'readWrite',
      });
      await writeToken
        .publishSchema({
          sdl,
          service,
          url: 'http://localocalhost:4444/example',
        })
        .then(r => r.expectNoGraphQLErrors());

      const modifiedSdl = `
      type Query {
        example(id: ID!): Example
      }

      type Example {
        id: ID!
        name: String!
      }
      
      extend type Example {
        preview: String
      }
      `;

      // add proposal check
      const { schemaCheck: proposedSchema } = await checkSchema({
        accessKey: ownerToken,
        input: {
          sdl: modifiedSdl,
          schemaProposalId: proposalId,
          service,
          target: { byId: target.id },
          url: 'http://localocalhost:4444/example',
        },
      }).then(r => r.expectNoGraphQLErrors());
      expect(proposedSchema.__typename).toBe('SchemaCheckSuccess');
      expect(
        proposedSchema.__typename === 'SchemaCheckSuccess' && proposedSchema.changes?.total,
      ).toBe(1);

      // approve the schema proposal
      await approveProposal({
        proposalId,
        service,
        accessKey: ownerToken,
      }).then(r => r.expectNoGraphQLErrors());

      // run another check that implements the proposal (no schemaProposalId passed as an argument)
      const { schemaCheck } = await checkSchema({
        accessKey: ownerToken,
        input: {
          sdl: modifiedSdl,
          service: 'example',
          target: { byId: target.id },
          url: 'http://localocalhost:4444/example',
        },
      }).then(r => r.expectNoGraphQLErrors());

      const checkId =
        schemaCheck.__typename === 'SchemaCheckSuccess' && schemaCheck.schemaCheck?.id!;
      expect(checkId).toBeDefined();

      const ReadCheckQuery = graphql(`
        query ReadCheck($targetId: ID!, $checkId: ID!) {
          target(reference: { byId: $targetId }) {
            schemaCheck(id: $checkId) {
              id
              schemaChanges {
                edges {
                  node {
                    schemaProposalChangeDetails {
                      implementedBy {
                        id
                      }
                      schemaProposal {
                        id
                      }
                    }
                  }
                }
              }
            }
          }
        }
      `);

      // schema check implementation tracking is an async process, so wait for the job to process
      const poll = pollFor(async () => {
        const { target: t } = await execute({
          document: ReadCheckQuery,
          variables: {
            checkId: String(checkId),
            targetId: target.id,
          },
          token: ownerToken,
        }).then(r => r.expectNoGraphQLErrors());
        const changeImplementsProposalId =
          t?.schemaCheck?.schemaChanges?.edges[0].node.schemaProposalChangeDetails?.schemaProposal
            .id;
        return changeImplementsProposalId === proposalId;
      });
      await expect(poll).resolves.toBeUndefined();
    },
  );
});
