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
    it('no-unreachable-types issue: directives are not scanned/marked as unused', async () => {
      const policyObject: SchemaPolicyInput = {
        rules: [
          {
            ruleId: 'no-unreachable-types',
            severity: RuleInstanceSeverityLevel.Error,
          },
        ],
      };

      const { tokens, policy } = await prepareProject(ProjectType.Federation);
      await policy.setOrganizationSchemaPolicy(policyObject, true);
      const cli = createCLI(tokens.registry);

      await cli.publish({
        sdl: /* GraphQL */ `
          type Query {
            a: String!
          }
        `,
        serviceName: 'a',
        serviceUrl: 'https://api.com/a',
        expect: 'latest-composable',
      });

      await cli.publish({
        sdl: /* GraphQL */ `
          type Query {
            b: String!
          }
        `,
        serviceName: 'b',
        serviceUrl: 'https://api.com/b',
        expect: 'latest-composable',
      });

      // In this example, the policy checks sees the "hasRole" directive in the schema
      // because we are using composeDirective.
      const rawMessage = await cli.check({
        sdl: /* GraphQL */ `
          extend schema
            @link(url: "https://specs.apollo.dev/link/v1.0")
            @link(url: "https://specs.apollo.dev/federation/v2.3", import: ["@composeDirective"])
            @link(url: "https://myspecs.dev/myDirective/v1.0", import: ["@hasRole"])
            @composeDirective(name: "@hasRole")

          scalar Unused

          scalar Used

          scalar UsedInInput

          directive @hasRole(role: Role!) on QUERY | MUTATION | FIELD_DEFINITION

          enum Role {
            admin
            user
          }

          enum Permission {
            read
            write
            create
            delete
          }

          type Query {
            userRole(roleID: Int!): UserRole! @hasRole(role: admin)
            scalar(input: UsedInInput!): Used
          }

          type UserRole {
            id: ID!
            name: String!
          }
        `,
        serviceName: 'c',
        expect: 'rejected',
      });
      const message = stripAnsi(rawMessage);

      expect(message).toContain(`Detected 2 errors`);
      expect(message.split('\n').slice(1)).toEqual([
        '✖ Detected 2 errors',
        '',
        '   - Scalar type `Unused` is unreachable. (source: policy-no-unreachable-types)',
        '   - Enum type `Permission` is unreachable. (source: policy-no-unreachable-types)',
        '',
        'ℹ Detected 9 changes',
        '',
        '   Safe changes:',
        '   - Type Permission was added',
        '   - Type Role was added',
        '   - Type Unused was added',
        '   - Type Used was added',
        '   - Type UsedInInput was added',
        '   - Type UserRole was added',
        '   - Field scalar was added to object type Query',
        '   - Field userRole was added to object type Query',
        '   - Directive hasRole was added',
        '',
        'View full report:',
        expect.any(String),
        '',
      ]);

      // But in this one, we are not using composeDirective, so the final compose directive
      // is not visible by the policy checker, and the policy checker will not detect it.
      // This is why it's being reported an unused, and also other related inputs/types.
      const rawMessage2 = await cli.check({
        sdl: /* GraphQL */ `
          scalar Unused

          scalar Used

          scalar UsedInInput

          directive @hasRole(role: Role!) on QUERY | MUTATION | FIELD_DEFINITION

          enum Role {
            admin
            user
          }

          enum Permission {
            read
            write
            create
            delete
          }

          type Query {
            userRole(roleID: Int!): UserRole! @hasRole(role: admin)
            scalar(input: UsedInInput!): Used
          }

          type UserRole {
            id: ID!
            name: String!
          }
        `,
        serviceName: 'c',
        expect: 'rejected',
      });
      const message2 = stripAnsi(rawMessage2);

      expect(message2).toContain(`Detected 4 errors`);
      expect(message2).toContain(
        `Scalar type \`Unused\` is unreachable. (source: policy-no-unreachable-types)`,
      );
      expect(message2).toContain(
        `Directive \`hasRole\` is unreachable. (source: policy-no-unreachable-types)`,
      );
      expect(message2).toContain(
        `Enum type \`Role\` is unreachable. (source: policy-no-unreachable-types)`,
      );
      expect(message2).toContain(
        `Enum type \`Permission\` is unreachable. (source: policy-no-unreachable-types)`,
      );
    });

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
