import { parseDateRangeInput } from '../../../shared/helpers';
import { OperationsManager } from '../../operations/providers/operations-manager';
import { ContractsManager } from '../providers/contracts-manager';
import { SchemaManager } from '../providers/schema-manager';
import { toGraphQLSchemaCheck, toGraphQLSchemaCheckCurry } from '../to-graphql-schema-check';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'activeContracts'
  | 'baseSchema'
  | 'contracts'
  | 'hasCollectedSubscriptionOperations'
  | 'hasSchema'
  | 'latestSchemaVersion'
  | 'latestValidSchemaVersion'
  | 'schemaCheck'
  | 'schemaChecks'
  | 'schemaVersion'
  | 'schemaVersions'
  | 'schemaVersionsCount'
> = {
  schemaVersions: async (target, args, { injector }) => {
    return injector.get(SchemaManager).getPaginatedSchemaVersionsForTargetId({
      targetId: target.id,
      organizationId: target.orgId,
      projectId: target.projectId,
      cursor: args.after ?? null,
      first: args.first ?? null,
    });
  },
  schemaVersion: async (target, args, { injector }) => {
    const schemaVersion = await injector.get(SchemaManager).getSchemaVersion({
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
      versionId: args.id,
    });

    if (schemaVersion === null) {
      return null;
    }

    return {
      ...schemaVersion,
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
    };
  },
  latestSchemaVersion: (target, _, { injector }) => {
    return injector.get(SchemaManager).getMaybeLatestVersion(target);
  },
  latestValidSchemaVersion: async (target, __, { injector }) => {
    return injector.get(SchemaManager).getMaybeLatestValidVersion(target);
  },
  baseSchema: (target, _, { injector }) => {
    return injector.get(SchemaManager).getBaseSchemaForTarget(target);
  },
  hasSchema: (target, _, { injector }) => {
    return injector.get(SchemaManager).hasSchema(target);
  },
  schemaCheck: async (target, args, { injector }) => {
    const schemaCheck = await injector.get(SchemaManager).findSchemaCheckForTarget(target, args.id);

    if (schemaCheck == null) {
      return null;
    }

    return toGraphQLSchemaCheck(
      {
        organizationId: target.orgId,
        projectId: target.projectId,
      },
      schemaCheck,
    );
  },
  schemaChecks: async (target, args, { injector }) => {
    const result = await injector.get(SchemaManager).getPaginatedSchemaChecksForTarget(target, {
      first: args.first ?? null,
      cursor: args.after ?? null,
      filters: args.filters ?? null,
      transformNode: toGraphQLSchemaCheckCurry({
        organizationId: target.orgId,
        projectId: target.projectId,
      }),
    });

    return {
      edges: result.items,
      pageInfo: result.pageInfo,
    };
  },
  schemaVersionsCount: (target, { period }, { injector }) => {
    return injector.get(SchemaManager).countSchemaVersionsOfTarget({
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
      period: period ? parseDateRangeInput(period) : null,
    });
  },
  contracts: async (target, args, { injector }) => {
    return await injector.get(ContractsManager).getPaginatedContractsForTarget({
      target,
      cursor: args.after ?? null,
      first: args.first ?? null,
    });
  },
  activeContracts: async (target, args, { injector }) => {
    return await injector.get(ContractsManager).getPaginatedActiveContractsForTarget({
      target,
      cursor: args.after ?? null,
      first: args.first ?? null,
    });
  },
  hasCollectedSubscriptionOperations: async (target, _, { injector }) => {
    return await injector.get(OperationsManager).hasCollectedSubscriptionOperations({
      targetId: target.id,
      projectId: target.projectId,
      organizationId: target.orgId,
    });
  },
};
