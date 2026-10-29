import { GraphQLError } from 'graphql';
import { parseDateRangeInput } from '../../../shared/helpers';
import {
  describeSubgraphResolutionFailure,
  SubgraphOwnership,
} from '../../schema/providers/subgraph-ownership';
import { OperationsManager } from '../providers/operations-manager';
import { Traces } from '../providers/traces';
import type { TargetResolvers } from './../../../__generated__/types';

const MAX_CLIENT_VERSION_FILTERS = 50;
const MAX_VERSIONS_PER_FILTER = 100;
const MAX_SCHEMA_COORDINATES = 100;
const MAX_SCHEMA_COORDINATE_LENGTH = 200;
const MAX_SUBGRAPH_NAMES = 50;
const MAX_SUBGRAPH_NAME_LENGTH = 100;

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
  // The stats parents only hold the period; checking here fails once instead of per child field.
  clientStats: async (target, args, { injector }) => {
    const period = parseDateRangeInput(args.period);
    await injector
      .get(OperationsManager)
      .assertPeriodWithinRetention({ organizationId: target.orgId, period });
    return {
      period,
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      clientName: args.clientName,
    };
  },
  operationsStats: async (target, args, { injector }) => {
    // Validate clientVersionFilters size limits to prevent DoS via large SQL IN clauses
    const clientVersionFilters = args.filter?.clientVersionFilters;
    if (clientVersionFilters) {
      if (clientVersionFilters.length > MAX_CLIENT_VERSION_FILTERS) {
        throw new GraphQLError(
          `'OperationStatsFilterInput.clientVersionFilters' must contain at most ${MAX_CLIENT_VERSION_FILTERS} elements`,
        );
      }
      for (const filter of clientVersionFilters) {
        if (filter.versions && filter.versions.length > MAX_VERSIONS_PER_FILTER) {
          throw new GraphQLError(
            `'ClientVersionFilterInput.versions' must contain at most ${MAX_VERSIONS_PER_FILTER} elements`,
          );
        }
      }
    }

    // Same bounds as a saved filter; the values are bound as ClickHouse URL parameters.
    const schemaCoordinates = args.filter?.schemaCoordinates ?? [];
    if (schemaCoordinates.length > MAX_SCHEMA_COORDINATES) {
      throw new GraphQLError(
        `'OperationStatsFilterInput.schemaCoordinates' must contain at most ${MAX_SCHEMA_COORDINATES} elements`,
      );
    }
    if (schemaCoordinates.some(c => c.length > MAX_SCHEMA_COORDINATE_LENGTH)) {
      throw new GraphQLError(
        `'OperationStatsFilterInput.schemaCoordinates' elements must be at most ${MAX_SCHEMA_COORDINATE_LENGTH} characters long`,
      );
    }
    const subgraphNames = args.filter?.subgraphNames ?? [];
    if (subgraphNames.length > MAX_SUBGRAPH_NAMES) {
      throw new GraphQLError(
        `'OperationStatsFilterInput.subgraphNames' must contain at most ${MAX_SUBGRAPH_NAMES} elements`,
      );
    }
    if (subgraphNames.some(n => n.length > MAX_SUBGRAPH_NAME_LENGTH)) {
      throw new GraphQLError(
        `'OperationStatsFilterInput.subgraphNames' elements must be at most ${MAX_SUBGRAPH_NAME_LENGTH} characters long`,
      );
    }

    const period = parseDateRangeInput(args.period);
    await injector
      .get(OperationsManager)
      .assertPeriodWithinRetention({ organizationId: target.orgId, period });

    const coordinateScopes: Array<readonly string[]> = [];
    if (schemaCoordinates.length > 0) {
      coordinateScopes.push(schemaCoordinates);
    }
    if (subgraphNames.length > 0) {
      const resolved = await injector.get(SubgraphOwnership).resolveFieldCoordinates({
        organizationId: target.orgId,
        projectId: target.projectId,
        targetId: target.id,
        subgraphNames,
      });
      switch (resolved.kind) {
        case 'ok':
          coordinateScopes.push(resolved.coordinates);
          break;
        // Nothing composable yet means no traffic to attribute; a name the schema does not
        // have is an error, so a typo does not read as zero traffic.
        case 'no-supergraph':
          coordinateScopes.push([]);
          break;
        case 'not-federation':
        case 'unknown-subgraphs':
        case 'too-many-coordinates':
          throw new GraphQLError(describeSubgraphResolutionFailure(resolved));
      }
    }

    return {
      period,
      organization: target.orgId,
      project: target.projectId,
      target: target.id,
      coordinateScopes,
      operations: args.filter?.operationIds ?? [],
      clients:
        // TODO: figure out if the mapping should actually happen here :thinking:
        args.filter?.clientNames?.map(clientName => (clientName === 'unknown' ? '' : clientName)) ??
        [],
      clientVersionFilters:
        clientVersionFilters?.map(f => ({
          clientName: f.clientName === 'unknown' ? '' : f.clientName,
          versions: f.versions ? [...f.versions] : null,
        })) ?? [],
      excludeOperations: args.filter?.excludeOperations ?? false,
      excludeClientVersionFilters: args.filter?.excludeClientVersionFilters ?? false,
    };
  },
  schemaCoordinateStats: async (target, args, { injector }) => {
    const period = parseDateRangeInput(args.period);
    await injector
      .get(OperationsManager)
      .assertPeriodWithinRetention({ organizationId: target.orgId, period });
    return {
      period,
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
