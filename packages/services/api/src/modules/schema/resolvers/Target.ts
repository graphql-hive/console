import { invariant } from '@hive/service-common';
import { parseDateRangeInput } from '../../../shared/helpers';
import { GraphStore } from '../../graph/providers/graph-store';
import { OperationsManager } from '../../operations/providers/operations-manager';
import { isFieldRequestedDeep } from '../lib/is-field-requested';
import { ContractsManager } from '../providers/contracts-manager';
import { SchemaManager } from '../providers/schema-manager';
import { toGraphQLSchemaCheck, toGraphQLSchemaCheckCurry } from '../to-graphql-schema-check';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'activeContracts'
  | 'baseSchema'
  | 'contracts'
  | 'fieldLevelMetricsDisplayState'
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
    const graph = await injector.get(GraphStore).findGraphForTargetIdByName(target.id, 'default');
    invariant(graph, "No graph with name 'default' exists.");
    return injector.get(SchemaManager).getPaginatedSchemaVersionsForGraph(graph, {
      cursor: args.after ?? null,
      first: args.first ?? null,
    });
  },
  schemaVersion: async (target, args, { injector }) => {
    return await injector.get(SchemaManager).getSchemaVersionBySelector({
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
      versionId: args.id,
    });
  },
  async latestSchemaVersion(target, _, { injector }) {
    const graph = await injector.get(GraphStore).findGraphForTargetIdByName(target.id, 'default');
    invariant(graph, "No graph with name 'default' exists.");
    return injector.get(SchemaManager).getMaybeLatestVersionForGraph(graph);
  },
  async latestValidSchemaVersion(target, __, { injector }) {
    const graph = await injector.get(GraphStore).findGraphForTargetIdByName(target.id, 'default');
    invariant(graph, "No graph with name 'default' exists.");
    return injector.get(SchemaManager).getMaybeLatestValidVersionForGraph(graph);
  },
  baseSchema: (target, _, { injector }) => {
    return injector.get(SchemaManager).getBaseSchemaForTarget(target);
  },
  hasSchema: (target, _, { injector }) => {
    return injector.get(SchemaManager).hasPublishedSchemaVersionInDefaultGraph(target);
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
  schemaChecks: async (target, args, { injector }, info) => {
    const operationSelectsSDL = isFieldRequestedDeep(info, [
      ['SchemaCheck', 'baseline'],
      ['SuccessfulSchemaCheck', 'baseline'],
      ['FailedSchemaCheck', 'baseline'],
      ['SuccessfulSchemaCheck', 'schemaSDL'],
      ['SuccessfulSchemaCheck', 'compositeSchemaSDL'],
      ['SuccessfulSchemaCheck', 'supergraphSDL'],
      ['FailedSchemaCheck', 'compositeSchemaSDL'],
      ['FailedSchemaCheck', 'supergraphSDL'],
      ['FailedSchemaCheck', 'schemaSDL'],
    ]);

    const isSchemaChangesSelected = isFieldRequestedDeep(info, [
      ['SuccessfulSchemaCheck', 'safeSchemaChanges'],
      ['SuccessfulSchemaCheck', 'breakingSchemaChanges'],
      ['FailedSchemaCheck', 'safeSchemaChanges'],
      ['FailedSchemaCheck', 'breakingSchemaChanges'],
    ]);

    const result = await injector.get(SchemaManager).getPaginatedSchemaChecksForTarget(target, {
      first: args.first ?? null,
      cursor: args.after ?? null,
      filters: args.filters ?? null,
      transformNode: toGraphQLSchemaCheckCurry({
        organizationId: target.orgId,
        projectId: target.projectId,
      }),
      withSDL: operationSelectsSDL,
      withChanges: isSchemaChangesSelected,
    });

    return {
      edges: result.items,
      pageInfo: result.pageInfo,
    };
  },
  schemaVersionsCount: (target, { period }, { injector }) => {
    return injector
      .get(SchemaManager)
      .countSchemaVersionsOfTarget(target, period ? parseDateRangeInput(period) : null);
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
  fieldLevelMetricsDisplayState: async (target, _, { injector }) => {
    return injector.get(OperationsManager).fieldLevelMetricsDisplayState({
      organizationId: target.orgId,
      targetId: target.id,
    });
  },
};
