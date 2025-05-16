import { initSeed } from 'testkit/seed';

describe('advanced breaking changes', async () => {
  test('an argument can safely migrate from nullable to non nullable if all usages provide that argument', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, updateTargetValidationSettings, waitForOperationsCollected } =
      await createProject();
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
          fields: [
            'Query',
            'Query.user',
            'Query.user.id',
            'Query.user.id!',
            'User',
            'User.id',
            'ID',
          ],
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
          timestamp: Date.now(),
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
    expect(body.operations.accepted).toBe(2);

    await waitForOperationsCollected(2);

    const checkUpdatingUsedArgumentNullability = async () => {
      const checkNonnullArgResult = await checkSchema(/* GraphQL */ `
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
    };

    await expect(checkUpdatingUsedArgumentNullability()).resolves.toMatchObject({
      schemaCheck: {
        __typename: 'SchemaCheckError',
        valid: false,
        changes: {
          nodes: [
            {
              criticality: 'Breaking',
              message: "Type for argument 'id' on field 'Query.user' changed from 'ID' to 'ID!'",
            },
          ],
          total: 1,
        },
      },
    });

    await updateTargetValidationSettings({
      isEnabled: true,
      percentage: 0,
    });

    await expect(checkUpdatingUsedArgumentNullability()).resolves.toMatchObject({
      schemaCheck: {
        __typename: 'SchemaCheckSuccess',
        valid: true,
        changes: {
          nodes: [
            {
              criticality: 'Breaking',
              message:
                "Type for argument 'id' on field 'Query.user' changed from 'ID' to 'ID!' (non-breaking based on usage)",
            },
          ],
          total: 1,
        },
      },
    });
  });

  test('an argument can NOT migrate from nullable to non nullable if NOT all usages provide that argument', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, updateTargetValidationSettings, waitForOperationsCollected } =
      await createProject();
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
        dd24cc29: {
          operationName: 'user',
          operation: 'query user { user { id } }',
          fields: ['Query', 'Query.user', 'User', 'User.id', 'ID'],
        },
        c3b6d9b0: {
          operationName: 'me',
          operation: 'query me { me { id name } }',
          fields: ['Query', 'Query.me', 'User', 'User.id', 'User.name', 'ID', 'String'],
        },
      },
      operations: [
        {
          operationMapKey: 'dd24cc29',
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
          timestamp: Date.now(),
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
    expect(body.operations.accepted).toBe(2);

    await waitForOperationsCollected(2);

    const checkUpdatingUsedArgumentNullability = async () => {
      const checkNonnullArgResult = await checkSchema(/* GraphQL */ `
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
    };

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
        __typename: 'SchemaCheckError',
        valid: false,
        changes: {
          nodes: [
            {
              criticality: 'Breaking',
              message: "Type for argument 'id' on field 'Query.user' changed from 'ID' to 'ID!'",
            },
          ],
          total: 1,
        },
      },
    });
  });

  test('an input field can migrate from nullable to non nullable if all usages provide that argument', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, updateTargetValidationSettings, waitForOperationsCollected } =
      await createProject();
    const { checkSchema, publishSchema, collectUsage } = await createTargetAccessToken({});

    const userResult = await publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          random(a: A): String
        }

        input A {
          b: B
        }

        input B {
          c: C
        }

        input C {
          d: String
        }
      `,
    });
    await userResult.expectNoGraphQLErrors();

    const usageReport = await collectUsage({
      size: 1,
      map: {
        sha256example: {
          operationName: 'user',
          operation: `query Foo {random(a: { b: { c: null } })}`,
          fields: [
            'Query.random',
            'Query.random.a',
            'Query.random.a!',
            'A.b',
            'A.b!',
            'B.c',
            'C.d',
            'String',
          ],
        },
      },
      operations: [
        {
          operationMapKey: 'sha256example',
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
      ],
    });
    expect(usageReport.status).toBe(200);
    expect(typeof usageReport.body).not.toBeInstanceOf(String);
    const body = usageReport.body as Exclude<typeof usageReport.body, string>;
    expect(body.operations.accepted).toBe(1);

    await waitForOperationsCollected(1);

    const checkUpdatingUsedArgumentNullability = async () => {
      const checkNonnullArgResult = await checkSchema(/* GraphQL */ `
        type Query {
          random(a: A): String
        }

        input A {
          b: B!
        }

        input B {
          c: C
        }

        input C {
          d: String
        }
      `);

      const result = await checkNonnullArgResult.expectNoGraphQLErrors();
      return result;
    };

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
        valid: true,
        changes: {
          nodes: [
            {
              criticality: 'Breaking',
              message:
                "Input field 'A.b' changed type from 'B' to 'B!' (non-breaking based on usage)",
            },
          ],
          total: 1,
        },
      },
    });
  });

  test('an input field can NOT migrate from nullable to non nullable if NOT all usages provide that argument', async () => {
    const { createOrg } = await initSeed().createOwner();
    const { createProject } = await createOrg();
    const { createTargetAccessToken, updateTargetValidationSettings, waitForOperationsCollected } =
      await createProject();
    const { checkSchema, publishSchema, collectUsage } = await createTargetAccessToken({});

    const userResult = await publishSchema({
      sdl: /* GraphQL */ `
        type Query {
          me: User
        }

        type User {
          id: ID!
          name: String
        }

        type Mutation {
          setMyName(input: SetMyNameInput): User!
        }

        input SetMyNameInput {
          name: String
        }
      `,
    });
    await userResult.expectNoGraphQLErrors();

    const usageReport = await collectUsage({
      size: 1,
      map: {
        b11560a5: {
          operationName: 'user',
          operation: 'mutation setname { setMyName(input: { name: null }) { id } }',
          fields: [
            'Mutation',
            'Mutation.setMyName',
            'Mutation.setMyName.input!',
            'Mutation.setMyName.input',
            'SetMyNameInput.name',
          ],
        },
      },
      operations: [
        {
          operationMapKey: 'b11560a5',
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
      ],
    });
    expect(usageReport.status).toBe(200);
    expect(typeof usageReport.body).not.toBeInstanceOf(String);
    const body = usageReport.body as Exclude<typeof usageReport.body, string>;
    expect(body.operations.accepted).toBe(1);

    await waitForOperationsCollected(1);

    const checkUpdatingUsedArgumentNullability = async () => {
      const checkNonnullArgResult = await checkSchema(/* GraphQL */ `
        type Query {
          me: User
        }

        type User {
          id: ID!
          name: String
        }

        type Mutation {
          setMyName(input: SetMyNameInput): User!
        }

        input SetMyNameInput {
          name: String!
        }
      `);

      const result = await checkNonnullArgResult.expectNoGraphQLErrors();
      return result;
    };

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
        __typename: 'SchemaCheckError',
        valid: false,
        changes: {
          nodes: [
            {
              criticality: 'Breaking',
              message: "Input field 'SetMyNameInput.name' changed type from 'String' to 'String!'",
            },
          ],
          total: 1,
        },
      },
    });
  });
});
