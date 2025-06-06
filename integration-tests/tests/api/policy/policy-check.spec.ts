import stripAnsi from 'strip-ansi';
import { ProjectType, RuleInstanceSeverityLevel, SchemaPolicyInput } from 'testkit/gql/graphql';
import { prepareProject } from 'testkit/registry-models';
import { createCLI } from '../../../testkit/cli';

export const createPolicy = (level: RuleInstanceSeverityLevel): SchemaPolicyInput => ({
  rules: [
    {
      ruleId: 'require-description',
      severity: level,
      configuration: {
        types: true,
      },
    },
  ],
});

describe('Schema policy checks', () => {
  describe('model: composite', () => {
    it('Federation project with policy with only warnings, should check only the part that was changed', async () => {
      const { tokens, policy } = await prepareProject(ProjectType.Federation);
      await policy.setOrganizationSchemaPolicy(
        createPolicy(RuleInstanceSeverityLevel.Warning),
        true,
      );
      const cli = createCLI(tokens.registry);

      await cli.publish({
        sdl: /* GraphQL */ `
          type Product @key(fields: "id") {
            id: ID!
            title: String
            url: String
          }

          extend type Query {
            product(id: ID!): Product
          }
        `,
        serviceName: 'products',
        serviceUrl: 'https://api.com/products',
        expect: 'latest-composable',
      });

      await cli.publish({
        sdl: /* GraphQL */ `
          type User @key(fields: "id") {
            id: ID!
            name: String!
          }

          extend type Query {
            user(id: ID!): User
          }
        `,
        serviceName: 'users',
        serviceUrl: 'https://api.com/users',
        expect: 'latest-composable',
      });

      const rawMessage = await cli.check({
        sdl: /* GraphQL */ `
          type User @key(fields: "id") {
            id: ID!
            name: String!
          }

          extend type Query {
            user(id: ID!): User
            field: String!
          }
        `,
        serviceName: 'users',
        expect: 'approved',
      });
      const message = stripAnsi(rawMessage);

      expect(message.split('\n')).toEqual([
        'ℹ Detected 1 change',
        '',
        '   Safe changes:',
        '   - Field field was added to object type Query',
        '',
        '',
        '⚠ Detected 1 warning',
        '',
        '   - Description is required for type User (source: policy-require-description)',
        '',
        'View full report:',
        expect.any(String),
      ]);
    });

    it('Federation project with policy with , should check only the part that was changed', async () => {
      const { tokens, policy } = await prepareProject(ProjectType.Federation);
      await policy.setOrganizationSchemaPolicy(createPolicy(RuleInstanceSeverityLevel.Error), true);
      const cli = createCLI(tokens.registry);

      await cli.publish({
        sdl: /* GraphQL */ `
          type Product @key(fields: "id") {
            id: ID!
            title: String
            url: String
          }

          extend type Query {
            product(id: ID!): Product
          }
        `,
        serviceName: 'products',
        serviceUrl: 'https://api.com/products',
        expect: 'latest-composable',
      });

      await cli.publish({
        sdl: /* GraphQL */ `
          type User @key(fields: "id") {
            id: ID!
            name: String!
          }

          extend type Query {
            user(id: ID!): User
          }
        `,
        serviceName: 'users',
        serviceUrl: 'https://api.com/users',
        expect: 'latest-composable',
      });

      const rawMessage = await cli.check({
        sdl: /* GraphQL */ `
          type User @key(fields: "id") {
            id: ID!
            name: String!
          }

          extend type Query {
            user(id: ID!): User
            field: String!
          }
        `,
        serviceName: 'users',
        expect: 'rejected',
      });
      const message = stripAnsi(rawMessage);

      expect(message).toContain(`Detected 1 error`);
      expect(message.split('\n').slice(1)).toEqual([
        '✖ Detected 1 error',
        '',
        '   - Description is required for type User (source: policy-require-description)',
        '',
        'ℹ Detected 1 change',
        '',
        '   Safe changes:',
        '   - Field field was added to object type Query',
        '',
        'View full report:',
        expect.any(String),
        '',
      ]);
    });
  });

  describe('model: single', () => {
    test('Single with policy with only warnings', async () => {
      const { tokens, policy } = await prepareProject(ProjectType.Single);
      await policy.setOrganizationSchemaPolicy(
        createPolicy(RuleInstanceSeverityLevel.Warning),
        true,
      );
      const cli = await createCLI(tokens.registry);

      await cli.publish({
        sdl: /* GraphQL */ `
          type Query {
            foo: String!
          }
        `,
        expect: 'latest-composable',
      });

      const rawMessage = await cli.check({
        sdl: /* GraphQL */ `
          type Query {
            foo: String!
            user: User!
          }

          type User {
            name: String!
          }
        `,
        expect: 'approved',
      });
      const message = stripAnsi(rawMessage);

      expect(message).toContain(`Detected 2 warnings`);
      expect(message.split('\n')).toEqual([
        'ℹ Detected 2 changes',
        '',
        '   Safe changes:',
        '   - Type User was added',
        '   - Field user was added to object type Query',
        '',
        '',
        '⚠ Detected 2 warnings',
        '',
        '   - Description is required for type Query (source: policy-require-description)',
        '   - Description is required for type User (source: policy-require-description)',
        '',
        'View full report:',
        expect.any(String),
      ]);
    });

    test('Single with policy with only errors', async () => {
      const { tokens, policy } = await prepareProject(ProjectType.Single);
      await policy.setOrganizationSchemaPolicy(createPolicy(RuleInstanceSeverityLevel.Error), true);
      const cli = await createCLI(tokens.registry);

      await cli.publish({
        sdl: /* GraphQL */ `
          type Query {
            foo: String!
          }
        `,
        expect: 'latest-composable',
      });

      const rawMessage = await cli.check({
        sdl: /* GraphQL */ `
          type Query {
            foo: String!
            user: User!
          }

          type User {
            name: String!
          }
        `,
        expect: 'rejected',
      });
      const message = stripAnsi(rawMessage);

      expect(message).toContain(`Detected 2 errors`);
      expect(message.split('\n').slice(1)).toEqual([
        '✖ Detected 2 errors',
        '',
        '   - Description is required for type Query (source: policy-require-description)',
        '   - Description is required for type User (source: policy-require-description)',
        '',
        'ℹ Detected 2 changes',
        '',
        '   Safe changes:',
        '   - Type User was added',
        '   - Field user was added to object type Query',
        '',
        'View full report:',
        expect.any(String),
        '',
      ]);
    });

    test('Single with policy with both errors and warning', async () => {
      const { tokens, policy } = await prepareProject(ProjectType.Single);
      await policy.setOrganizationSchemaPolicy(
        {
          rules: [
            {
              ruleId: 'require-description',
              severity: RuleInstanceSeverityLevel.Error,
              configuration: {
                types: true,
              },
            },
            {
              ruleId: 'require-deprecation-reason',
              severity: RuleInstanceSeverityLevel.Warning,
            },
          ],
        },
        true,
      );
      const cli = await createCLI(tokens.registry);

      await cli.publish({
        sdl: /* GraphQL */ `
          type Query {
            foo: String!
          }
        `,
        expect: 'latest-composable',
      });

      const rawMessage = await cli.check({
        sdl: /* GraphQL */ `
          type Query {
            foo: String! @deprecated(reason: "")
            user: User!
          }

          type User {
            name: String!
          }
        `,
        expect: 'rejected',
      });
      const message = stripAnsi(rawMessage);

      expect(message).toContain(`Detected 2 errors`);
      expect(message).toContain(`Detected 1 warning`);
      expect(message.split('\n').slice(1)).toEqual([
        '✖ Detected 2 errors',
        '',
        '   - Description is required for type Query (source: policy-require-description)',
        '   - Description is required for type User (source: policy-require-description)',
        '',
        '',
        '⚠ Detected 1 warning',
        '',
        '   - Deprecation reason is required for field foo in type Query. (source: policy-require-deprecation-reason)',
        '',
        'ℹ Detected 3 changes',
        '',
        '   Safe changes:',
        '   - Type User was added',
        '   - Field user was added to object type Query',
        '   - Field Query.foo is deprecated',
        '',
        'View full report:',
        expect.any(String),
        '',
      ]);
    });
  });
});
