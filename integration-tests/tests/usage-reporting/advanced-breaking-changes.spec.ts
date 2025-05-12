import { initSeed } from 'testkit/seed';
import { waitFor } from 'testkit/flow';

describe('advanced breaking changes', async () => {
  test('an argument can safely migrate from nullable to non nullable if all usages provide that argument', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, updateTargetValidationSettings } = await createProject();
    const { checkSchema, publishSchema, collectUsage } = await createTargetAccessToken({});

    const userResult = await publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          user(id: ID): User
          me: User
        }

        type User {
          id: ID!
          name: String
        }
      `,
    });
    await userResult.expectNoGraphQLErrors();

    const usageReport = await collectUsage({
      size: 2,
      map: {
        '4de79319': {
          operationName: 'user',
          operation: 'query user { user(id: "1234") { id } }',
          fields: ['Query', 'Query.user', 'Query.user.id', 'User', 'User.id', 'ID'],
        },
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name'],
        },
      },
      operations: [
        {
          operationMapKey: '4de79319',
          timestamp: Date.now(),
          execution: {
            ok: true,
            duration: 100000000,
            errorsTotal: 0,
          },
          metadata: {
            client: {
              name: 'demo',
              version: '0.0.1',
            },
          },
        },
        {
          operationMapKey: 'c3b6d9b0',
          timestamp: Date.now() - 10,
          execution: {
            ok: true,
            duration: 150000000,
            errorsTotal: 0,
          },
          metadata: {
            client: {
              name: 'demo',
              version: '0.0.1',
            },
          },
        },
      ],
    });
    expect(usageReport.status).toBe(200);
    expect(typeof usageReport.body).not.toBeInstanceOf(String);
    const body = usageReport.body as Exclude<typeof usageReport.body, string>;
    expect(body.operations.accepted).toBe(2)

    waitFor(20);
  
    const checkUpdatingUsedArgumentNullability = async () => {
      const checkNonnullArgResult = await checkSchema(/* GraphQL */`
        type Query {
          user(id: ID!): User
          me: User
        }

        type User {
          id: ID!
          name: String
        }
      `);

      const result = await checkNonnullArgResult.expectNoGraphQLErrors();
      return result;
    }
    
    await expect(checkUpdatingUsedArgumentNullability()).resolves.toMatchObject({
      schemaCheck: {
        __typename: 'SchemaCheckError',
      },
    });

    await updateTargetValidationSettings({
      isEnabled: true,
      percentage: 0,
    });

    await expect(checkUpdatingUsedArgumentNullability()).resolves.toMatchObject({
      schemaCheck: {
        __typename: 'SchemaCheckSuccess',
        changes: {
          nodes: [
            {
              criticality: "Breaking",
              message: "Type for argument 'id' on field 'Query.user' changed from 'ID' to 'ID!' (non-breaking based on usage)",
            },
          ],
          total: 1,
        }
      },
    });
  });
});