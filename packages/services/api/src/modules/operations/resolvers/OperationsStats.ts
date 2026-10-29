import { hash } from '../../../shared/helpers';
import { OperationsManager } from '../providers/operations-manager';
import type { OperationsStatsResolvers } from './../../../__generated__/types';

export const OperationsStats: OperationsStatsResolvers = {
  operations: async (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    _,
    { injector },
  ) => {
    const operationsManager = injector.get(OperationsManager);
    const [operations, durations] = await Promise.all([
      operationsManager.readOperationsStats({
        organizationId: organization,
        projectId: project,
        targetId: target,
        period,
        operations: operationsFilter,
        clients,
        clientVersionFilters,
        excludeOperations,
        excludeClientVersionFilters,
        coordinateScopes,
      }),
      operationsManager.readDetailedDurationMetrics({
        organizationId: organization,
        projectId: project,
        targetId: target,
        period,
        operations: operationsFilter,
        clients,
        clientVersionFilters,
        excludeOperations,
        excludeClientVersionFilters,
        coordinateScopes,
      }),
    ]);

    const nodes = operations
      .map(op => {
        return {
          id: hash(`${op.operationName}__${op.operationHash}`),
          kind: op.kind,
          name: op.operationName,
          count: op.count,
          countOk: op.countOk,
          percentage: op.percentage,
          duration: durations.get(op.operationHash)!,
          operationHash: op.operationHash,
        };
      })
      .sort((a, b) => b.count - a.count);

    return {
      edges: nodes.map(node => ({ node, cursor: '' })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: '',
        startCursor: '',
      },
    };
  },
  totalRequests: (
    {
      organization,
      project,
      target,
      period,
      operations,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    _,
    { injector },
  ) => {
    return injector.get(OperationsManager).countRequestsAndFailures({
      organizationId: organization,
      projectId: project,
      targetId: target,
      period,
      operations,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });
  },
  totalFailures: (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    _,
    { injector },
  ) => {
    return injector.get(OperationsManager).countFailures({
      organizationId: organization,
      projectId: project,
      targetId: target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });
  },
  totalOperations: (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    _,
    { injector },
  ) => {
    return injector.get(OperationsManager).countUniqueOperations({
      organizationId: organization,
      projectId: project,
      targetId: target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });
  },
  requestsOverTime: (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    { resolution },
    { injector },
  ) => {
    return injector.get(OperationsManager).readRequestsOverTime({
      targetId: target,
      projectId: project,
      organizationId: organization,
      period,
      resolution,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });
  },
  failuresOverTime: (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    { resolution },
    { injector },
  ) => {
    return injector.get(OperationsManager).readFailuresOverTime({
      targetId: target,
      projectId: project,
      organizationId: organization,
      period,
      resolution,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });
  },
  durationOverTime: (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    { resolution },
    { injector },
  ) => {
    return injector.get(OperationsManager).readDurationOverTime({
      targetId: target,
      projectId: project,
      organizationId: organization,
      period,
      resolution,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });
  },
  clients: async (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    _,
    { injector },
  ) => {
    const nodes = await injector.get(OperationsManager).readUniqueClients({
      targetId: target,
      projectId: project,
      organizationId: organization,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });

    return {
      edges: nodes.map(node => ({ node, cursor: '' })),
      pageInfo: {
        hasNextPage: false,
        hasPreviousPage: false,
        endCursor: '',
        startCursor: '',
      },
    };
  },
  duration: (
    {
      organization,
      project,
      target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    },
    _,
    { injector },
  ) => {
    return injector.get(OperationsManager).readGeneralDurationPercentiles({
      organizationId: organization,
      projectId: project,
      targetId: target,
      period,
      operations: operationsFilter,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
    });
  },
};
