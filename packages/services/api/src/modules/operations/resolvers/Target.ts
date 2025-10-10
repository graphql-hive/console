import { parseDateRangeInput } from '../../../shared/helpers';
import { OperationsManager } from '../providers/operations-manager';
import { Traces } from '../providers/traces';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'clientStats'
  | 'operation'
  | 'operationsStats'
  | 'requestsOverTime'
  | 'schemaCoordinateStats'
  | 'totalRequests'
  | 'trace'
  | 'traces'
  | 'tracesFilterOptions'
  | 'tracesStatusBreakdown'
  | 'viewerCanAccessTraces'
> = {
  totalRequests: (target, { period }, { injector }) => {
    return injector.get(OperationsManager).countRequests({
      targetId: target.id,
      projectId: target.projectId,
      organizationId: target.orgId,
      period: parseDateRangeInput(period),
    });
  },
  requestsOverTime: async (target, { resolution, period }, { injector }) => {
    const result = await injector.get(OperationsManager).readRequestsOverTimeOfTargets({
      projectId: target.projectId,
      organizationId: target.orgId,
      targets: [target.id],
      period: parseDateRangeInput(period),
      resolution,
    });

    return result[target.id] ?? [];
  },
  operation: (target, args, { injector }) => {
    return injector.get(OperationsManager).getOperation({
      hash: args.hash,
      organizationId: target.orgId,
      projectId: target.projectId,
      targetId: target.id,
    });
  },
  clientStats: async (target, args, _ctx) => {
    return {
      period: parseDateRangeInput(args.period),
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      clientName: args.clientName,
    };
  },
  operationsStats: async (target, args, _ctx) => {
    return {
      period: parseDateRangeInput(args.period),
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      operations: args.filter?.operationIds ?? [],
      clients:
        // TODO: figure out if the mapping should actually happen here :thinking:
        args.filter?.clientNames?.map(clientName => (clientName === 'unknown' ? '' : clientName)) ??
        [],
    };
  },
  schemaCoordinateStats: async (target, args, _ctx) => {
    return {
      period: parseDateRangeInput(args.period),
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      schemaCoordinate: args.schemaCoordinate,
    };
  },
  traces: async (target, { first, filter, sort, after }, { injector }) => {
    return injector.get(Traces).findTracesForTargetId(
      target.orgId,
      target.id,
      first ?? null,
      {
        period: filter?.period ?? null,
        duration: filter?.duration
          ? {
              min: filter.duration.min ?? null,
              max: filter.duration.max ?? null,
            }
          : null,
        traceIds: filter?.traceIds ?? null,
        success: filter?.success ?? null,
        errorCodes: filter?.errorCodes ?? null,
        operationNames: filter?.operationNames ?? null,
        operationTypes: filter?.operationTypes?.map(value => value ?? null) ?? null,
        clientNames: filter?.clientNames ?? null,
        subgraphNames: filter?.subgraphNames ?? null,
        httpMethods: filter?.httpMethods ?? null,
        httpStatusCodes: filter?.httpStatusCodes ?? null,
        httpHosts: filter?.httpHosts ?? null,
        httpRoutes: filter?.httpRoutes ?? null,
        httpUrls: filter?.httpUrls ?? null,
      },
      sort ?? null,
      after ?? null,
    );
  },
  tracesFilterOptions(target, { filter }, { injector }) {
    return injector.get(Traces).getTraceFilterOptions(target.id, filter ?? null);
  },
  trace(target, args, { injector }) {
    return injector.get(Traces).findTraceById(target.orgId, target.id, args.traceId);
  },
  tracesStatusBreakdown: async (target, { filter }, { injector }) => {
    return injector.get(Traces).getTraceStatusBreakdownForTargetId(target.orgId, target.id, {
      period: filter?.period ?? null,
      duration: filter?.duration
        ? {
            min: filter.duration.min ?? null,
            max: filter.duration.max ?? null,
          }
        : null,
      traceIds: filter?.traceIds ?? null,
      success: filter?.success ?? null,
      errorCodes: filter?.errorCodes ?? null,
      operationNames: filter?.operationNames ?? null,
      operationTypes: filter?.operationTypes?.map(value => value ?? null) ?? null,
      clientNames: filter?.clientNames ?? null,
      subgraphNames: filter?.subgraphNames ?? null,
      httpMethods: filter?.httpMethods ?? null,
      httpStatusCodes: filter?.httpStatusCodes ?? null,
      httpHosts: filter?.httpHosts ?? null,
      httpRoutes: filter?.httpRoutes ?? null,
      httpUrls: filter?.httpUrls ?? null,
    });
  },
  viewerCanAccessTraces: async (target, _, { injector }) => {
    return injector.get(Traces).viewerCanAccessTraces(target.orgId);
  },
};
