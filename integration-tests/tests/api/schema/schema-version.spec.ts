import { waitFor } from 'testkit/flow';
import { ProjectType } from 'testkit/gql/graphql';
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const SchemaByActionIdQuery = graphql(/* GraphQL */ `
  query SchemaByActionIdQuery($actionId: ID!, $targetRef: TargetReferenceInput) {
    schemaVersionForActionId(actionId: $actionId, target: $targetRef) {
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
  'schema version by actionId returns latest schema for the actionId',
  async ({ expect }) => {
    const actionId = 'tiny-test-0';
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
        commit: actionId,
      })
      .then(r => r.expectNoGraphQLErrors());

    // note: there's a race condition in the publishSchema resolver if we repeatedly publish too quickly
    waitFor(200);

    await token
      .publishSchema({
        sdl: latestSchema,
        commit: actionId,
      })
      .then(r => r.expectNoGraphQLErrors());

    const result = await execute({
      document: SchemaByActionIdQuery,
      token: token.secret,
      variables: {
        actionId,
        targetRef: { byId: target.id },
      },
    }).then(r => r.expectNoGraphQLErrors());

    expect(result.schemaVersionForActionId?.sdl).toIncludeSubstringWithoutWhitespace(latestSchema);
  },
);
