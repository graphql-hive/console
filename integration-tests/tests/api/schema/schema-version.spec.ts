import { ProjectType } from 'testkit/gql/graphql';
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const SchemaByCommitQuery = graphql(/* GraphQL */ `
  query SchemaByCommitQuery($commit: String!, $targetRef: TargetReferenceInput) {
    schemaVersionByCommit(commit: $commit, target: $targetRef) {
      id
      sdl
      log {
        ... on PushedSchemaLog {
          id
          commit
        }
      }
    }
  }
`);

test.concurrent(
  'schema version by commit returns latest schema for the commit',
  async ({ expect }) => {
    const commit = 'tiny-test-0';
    const schema = /* GraphQL */ `
      type Query {
        ping: String
      }
    `;
    const latestSchema = /* GraphQL */ `
      type Query {
        ping: String
        pong: String
      }
    `;
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target } = await createProject(ProjectType.Single);

    const token = await createTargetAccessToken({
      mode: 'readWrite',
    });

    await token
      .publishSchema({
        sdl: schema,
        commit,
      })
      .then(r => r.expectNoGraphQLErrors());

    await token
      .publishSchema({
        sdl: latestSchema,
        commit,
      })
      .then(r => r.expectNoGraphQLErrors());

    const result = await execute({
      document: SchemaByCommitQuery,
      token: token.secret,
      variables: {
        commit,
        targetRef: { byId: target.id },
      },
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.schemaVersionByCommit?.sdl).toIncludeSubstringWithoutWhitespace(latestSchema);
  },
);
