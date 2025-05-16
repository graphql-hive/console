import { addDays, formatISO } from 'date-fns';
import { ProjectType } from 'testkit/gql/graphql';
import { waitFor } from '../../../testkit/flow';
// eslint-disable-next-line import/no-extraneous-dependencies
import { graphql } from '../../../testkit/gql';
import { execute } from '../../../testkit/graphql';
import { initSeed } from '../../../testkit/seed';

const IntegrationTestsUnusedSchemaQuery = graphql(/* GraphQL */ `
  query IntegrationTestsUnusedSchema(
    $usageInput: UnusedSchemaExplorerUsageInput!
    $targetRef: TargetReferenceInput!
  ) {
    latestValidVersion(target: $targetRef) {
      unusedSchema(usage: $usageInput) {
        types {
          __typename
          ... on GraphQLObjectType {
            name
            fields {
              name
              usage {
                isUsed
              }
            }
          }
        }
      }
    }
  }
`);

test.concurrent(
  'a field from a type extension should be a part of unused schema if unused',
  async ({ expect }) => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, target, waitForOperationsCollected } = await createProject(ProjectType.Single);

    // Create a token with write rights
    const writeToken = await createTargetAccessToken({});

    // Publish schema with write rights
    const publishResult = await writeToken
      .publishSchema({
        sdl: /* GraphQL */ `
          type Query {
            user: User
          }

          type User {
            id: ID!
          }

          extend type User {
            name: String
          }
        `,
      })
      .then(r => r.expectNoGraphQLErrors());
    // Schema publish should be successful
    expect(publishResult.schemaPublish.__typename).toBe('SchemaPublishSuccess');

    const period = {
      from: formatISO(addDays(new Date(), -7)),
      to: formatISO(addDays(new Date(), 1)),
    };

    const firstQuery = await execute({
      document: IntegrationTestsUnusedSchemaQuery,
      variables: {
        targetRef: {
          byId: target.id,
        },
        usageInput: {
          period,
        },
      },
      authToken: writeToken.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect(firstQuery.latestValidVersion?.unusedSchema?.types).toHaveLength(2);

    let userType = firstQuery.latestValidVersion?.unusedSchema?.types.find(t =>
      'name' in t ? t.name === 'User' : false,
    );

    if (!userType) {
      throw new Error('User type not found');
    }

    if (userType.__typename !== 'GraphQLObjectType') {
      throw new Error('User type is not an object type');
    }

    let idField = userType.fields.find(f => f.name === 'id');
    let nameField = userType.fields.find(f => f.name === 'name');

    expect(idField?.usage.isUsed).toEqual(false);
    expect(nameField, 'User.name should exist').toBeDefined();
    expect(nameField?.usage.isUsed, 'User.name should be unused').toEqual(false);

    // mark name field as used
    const collectResult = await writeToken.collectUsage({
      size: 1,
      map: {
        op1: {
          operation: 'query UserName { user { name } }',
          operationName: 'UserName',
          fields: ['Query', 'Query.user', 'User', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: 'op1',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 200_000_000,
            errorsTotal: 0,
          },
        },
      ],
    });
    expect(collectResult.status).toEqual(200);
    await waitForOperationsCollected(1);

    const secondQuery = await execute({
      document: IntegrationTestsUnusedSchemaQuery,
      variables: {
        targetRef: {
          byId: target.id,
        },
        usageInput: {
          period,
        },
      },
      authToken: writeToken.secret,
    }).then(r => r.expectNoGraphQLErrors());

    expect(secondQuery.latestValidVersion?.unusedSchema?.types).toHaveLength(1);

    userType = secondQuery.latestValidVersion?.unusedSchema?.types.find(t =>
      'name' in t ? t.name === 'User' : false,
    );

    if (!userType) {
      throw new Error('User type not found');
    }

    if (userType.__typename !== 'GraphQLObjectType') {
      throw new Error('User type is not an object type');
    }

    idField = userType.fields.find(f => f.name === 'id');
    nameField = userType.fields.find(f => f.name === 'name');

    expect(idField?.usage.isUsed).toEqual(false);
    expect(nameField, 'User.name should not be used').toEqual(undefined);
  },
);
