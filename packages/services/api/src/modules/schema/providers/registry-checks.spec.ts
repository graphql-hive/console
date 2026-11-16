import 'reflect-metadata';
import { describe, expect, test } from 'vitest';
import type { DangerousChangeType } from '@hive/api/__generated__/types';
import type { OperationsReader } from '../../operations/providers/operations-reader';
import type { SchemaPolicyProvider } from '../../policy/providers/schema-policy.provider';
import { NoopLogger } from '../../shared/providers/logger';
import { Inspector } from './inspector';
import type { CompositionOrchestrator } from './orchestrator/composition-orchestrator';
import { RegistryChecks, type GetAffectedAppDeployments } from './registry-checks';
import { SchemaHelper } from './schema-helper';

/** A registry whose usage data is the given request count per schema coordinate. */
function createRegistryChecks(usage: Record<string, number>) {
  const operationsReader = {
    countCoordinate: async ({ schemaCoordinate }: { schemaCoordinate: string }) => ({
      [schemaCoordinate]: usage[schemaCoordinate] ?? 0,
    }),
    getTopClientsForSchemaCoordinate: async () => [],
    getTopOperationsForSchemaCoordinate: async () => [],
    countCoordinatePerTarget: async () => [],
    getOperationCountsPerTarget: async () => [],
  };
  const logger = new NoopLogger();

  return new RegistryChecks(
    new SchemaHelper(),
    {} as unknown as SchemaPolicyProvider,
    new Inspector(logger),
    logger,
    operationsReader as unknown as OperationsReader,
    {} as unknown as CompositionOrchestrator,
  );
}

/** Active app deployments keyed by the schema coordinate their documents use. */
function activeAppDeployments(byCoordinate: Record<string, string[]>): GetAffectedAppDeployments {
  return async coordinates =>
    new Map(
      coordinates
        .filter(coordinate => coordinate in byCoordinate)
        .map(coordinate => [
          coordinate,
          byCoordinate[coordinate].map(name => ({
            id: 'b1b3a0e2-6a1c-4d0e-9d3f-2f6f0c1a9e11',
            name,
            version: '1.0.0',
            createdAt: '2026-11-01T00:00:00.000Z',
            activatedAt: '2026-11-01T00:00:00.000Z',
            retiredAt: null,
            affectedOperations: [{ hash: 'users-hash', name: 'Users' }],
          })),
        ]),
    );
}

const existingSdl = /* GraphQL */ `
  type Query {
    users(limit: Int): [String]
  }
`;

const withDefaultedArgument = /* GraphQL */ `
  type Query {
    users(limit: Int, region: String = "eu"): [String]
  }
`;

const withRequiredArgument = /* GraphQL */ `
  type Query {
    users(limit: Int, region: String!): [String]
  }
`;

/** Diffs with conditional breaking changes on, failing the given dangerous change types. */
function diff(
  checks: RegistryChecks,
  args: {
    existingSdl?: string;
    incomingSdl: string;
    failDangerousChangeTypes?: DangerousChangeType[];
    getAffectedAppDeployments?: GetAffectedAppDeployments;
  },
) {
  return checks.diff({
    existingSdl: args.existingSdl ?? existingSdl,
    incomingSdl: args.incomingSdl,
    includeUrlChanges: false,
    filterOutFederationChanges: false,
    approvedChanges: null,
    conditionalBreakingChangeConfig: {
      period: { from: new Date('2026-11-01T00:00:00Z'), to: new Date('2026-11-13T00:00:00Z') },
      requestCountThreshold: 1,
      targetIds: ['target-id'],
      excludedClientNames: null,
      excludedAppDeploymentNames: null,
    },
    failDiffOnDangerousChange: (args.failDangerousChangeTypes?.length ?? 0) > 0,
    failAllDangerousChanges: false,
    failDangerousChangeTypes: args.failDangerousChangeTypes ?? [],
    filterNestedChanges: true,
    getAffectedAppDeployments: args.getAffectedAppDeployments ?? null,
  });
}

describe('RegistryChecks.diff', () => {
  describe('dangerous change the target fails on', () => {
    test('passes as safe based on usage when no operation requests the field', async () => {
      const result = await diff(createRegistryChecks({}), {
        incomingSdl: withDefaultedArgument,
        failDangerousChangeTypes: ['FIELD_ARGUMENT_ADDED'],
      });

      expect(result).toMatchObject({
        status: 'completed',
        result: {
          breaking: [{ type: 'FIELD_ARGUMENT_ADDED', isSafeBasedOnUsage: true }],
          safe: null,
        },
      });
    });

    test('fails when operations request the field', async () => {
      const result = await diff(createRegistryChecks({ 'Query.users': 10 }), {
        incomingSdl: withDefaultedArgument,
        failDangerousChangeTypes: ['FIELD_ARGUMENT_ADDED'],
      });

      expect(result).toMatchObject({
        status: 'failed',
        reason: {
          breaking: [{ type: 'FIELD_ARGUMENT_ADDED', isSafeBasedOnUsage: false }],
        },
      });
    });

    test('fails when an active app deployment uses the field and no operation requests it', async () => {
      const result = await diff(createRegistryChecks({}), {
        incomingSdl: withDefaultedArgument,
        failDangerousChangeTypes: ['FIELD_ARGUMENT_ADDED'],
        getAffectedAppDeployments: activeAppDeployments({ 'Query.users': ['web-app'] }),
      });

      expect(result).toMatchObject({
        status: 'failed',
        reason: {
          breaking: [
            {
              type: 'FIELD_ARGUMENT_ADDED',
              isSafeBasedOnUsage: false,
              affectedAppDeployments: [{ name: 'web-app' }],
            },
          ],
        },
      });
    });

    test('fails regardless of usage when usage is not recorded for its coordinate', async () => {
      const result = await diff(createRegistryChecks({}), {
        existingSdl: /* GraphQL */ `
          type Query {
            role: Role
          }

          enum Role {
            USER
          }
        `,
        incomingSdl: /* GraphQL */ `
          type Query {
            role: Role
          }

          enum Role {
            USER
            ADMIN
          }
        `,
        failDangerousChangeTypes: ['ENUM_VALUE_ADDED'],
      });

      expect(result).toMatchObject({
        status: 'failed',
        reason: {
          breaking: [{ type: 'ENUM_VALUE_ADDED', isSafeBasedOnUsage: false }],
        },
      });
    });

    test('stays a safe change when the target does not fail on it', async () => {
      const result = await diff(createRegistryChecks({}), {
        incomingSdl: withDefaultedArgument,
      });

      expect(result).toMatchObject({
        status: 'completed',
        result: {
          breaking: null,
          safe: [{ type: 'FIELD_ARGUMENT_ADDED', isSafeBasedOnUsage: false }],
        },
      });
    });
  });

  describe('required argument added to an existing field', () => {
    test('fails when operations request the field', async () => {
      const result = await diff(createRegistryChecks({ 'Query.users': 10 }), {
        incomingSdl: withRequiredArgument,
      });

      expect(result).toMatchObject({
        status: 'failed',
        reason: {
          breaking: [{ type: 'FIELD_ARGUMENT_ADDED', isSafeBasedOnUsage: false }],
        },
      });
    });

    test('passes as safe based on usage when no operation requests the field', async () => {
      const result = await diff(createRegistryChecks({}), {
        incomingSdl: withRequiredArgument,
      });

      expect(result).toMatchObject({
        status: 'completed',
        result: {
          breaking: [{ type: 'FIELD_ARGUMENT_ADDED', isSafeBasedOnUsage: true }],
          safe: null,
        },
      });
    });
  });
});
