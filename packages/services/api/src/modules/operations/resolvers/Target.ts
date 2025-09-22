import Dataloader from 'dataloader';
import { parseDateRangeInput } from '../../../shared/helpers';
import { ClickHouse, sql } from '../providers/clickhouse-client';
import { OperationsManager } from '../providers/operations-manager';
import { SqlValue } from '../providers/sql';
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
  traces: async (target, { first, filter, sort }, { injector }) => {
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
        operationTypes: filter?.operationTypes ?? null,
        clientNames: filter?.clientNames ?? null,
        subgraphNames: filter?.subgraphNames ?? null,
        httpMethods: filter?.httpMethods ?? null,
        httpStatusCodes: filter?.httpStatusCodes ?? null,
        httpHosts: filter?.httpHosts ?? null,
        httpRoutes: filter?.httpRoutes ?? null,
        httpUrls: filter?.httpUrls ?? null,
      },
      sort ?? null,
    );
  },
  tracesFilterOptions: async (target, { filter }, { injector }) => {
    const ANDs: SqlValue[] = [sql`target_id = ${target.id}`];

    if (filter?.traceIds?.length) {
      ANDs.push(sql`"trace_id" IN (${sql.array(filter.traceIds, 'String')})`);
    }

    if (filter?.success?.length) {
      const hasSuccess = filter.success.includes(true);
      const hasError = filter.success.includes(false);

      if (hasSuccess && !hasError) {
        ANDs.push(
          sql`"graphql_error_count" = 0`,
          sql`substring("http_status_code", 1, 1) IN (${sql.array(['2', '3'], 'String')})`,
        );
      } else if (hasError && !hasSuccess) {
        ANDs.push(
          sql`"graphql_error_count" > 0`,
          sql`substring("http_status_code", 1, 1) NOT IN (${sql.array(['2', '3'], 'String')})`,
        );
      }
    }

    if (filter?.operationNames?.length) {
      ANDs.push(sql`"graphql_operation_name" IN (${sql.array(filter.operationNames, 'String')})`);
    }

    if (filter?.operationTypes?.length) {
      ANDs.push(
        sql`"graphql_operation_type" IN (${sql.array(
          filter.operationTypes.map(value => (value == null ? '' : value.toLowerCase())),
          'String',
        )})`,
      );
    }

    if (filter?.clientNames?.length) {
      ANDs.push(sql`"client_name" IN (${sql.array(filter.clientNames, 'String')})`);
    }

    if (filter?.subgraphNames?.length) {
      ANDs.push(
        sql`hasAny("subgraph_names", (${sql.array(filter.subgraphNames.flat(), 'String')}))`,
      );
    }

    if (filter?.httpStatusCodes?.length) {
      ANDs.push(
        sql`"http_status_code" IN (${sql.array(filter.httpStatusCodes.map(String), 'UInt16')})`,
      );
    }

    if (filter?.httpMethods?.length) {
      ANDs.push(sql`"http_method" IN (${sql.array(filter.httpMethods, 'String')})`);
    }

    if (filter?.httpHosts?.length) {
      ANDs.push(sql`"http_host" IN (${sql.array(filter.httpHosts, 'String')})`);
    }

    if (filter?.httpRoutes?.length) {
      ANDs.push(sql`"http_route" IN (${sql.array(filter.httpRoutes, 'String')})`);
    }

    if (filter?.httpUrls?.length) {
      ANDs.push(sql`"http_url" IN (${sql.array(filter.httpUrls, 'String')})`);
    }

    const loader = new Dataloader<
      {
        key: string;
        columnExpression: string;
        limit: number | null;
        arrayJoinColumn: string | null;
      },
      { value: string; count: number }[],
      string
    >(
      async inputs => {
        const statements: SqlValue[] = [];

        for (const { key, columnExpression, limit, arrayJoinColumn } of inputs) {
          statements.push(sql`
            SELECT
              ${key} AS "key",
              toString(${sql.raw(columnExpression)}) AS "value",
              count(*) AS "count"
            FROM "otel_traces_normalized"
            ${sql.raw(arrayJoinColumn ? `ARRAY JOIN ${arrayJoinColumn} AS "value"` : '')}
            WHERE ${sql.join(ANDs, ' AND ')}
            GROUP BY value
            ORDER BY count DESC
            ${sql.raw(limit ? `LIMIT ${limit}` : '')}
          `);
        }

        const results = await injector.get(ClickHouse).query<{
          key: string;
          value: string;
          count: number;
        }>({
          query: sql`
            ${sql.join(statements, ' UNION ALL ')}
          `,
          queryId: 'traces_filter_options',
          timeout: 10_000,
        });

        const rowsGroupedByKey = results.data.reduce(
          (acc, row) => {
            if (!acc[row.key]) {
              acc[row.key] = [];
            }
            acc[row.key].push({ value: row.value, count: row.count });
            return acc;
          },
          {} as Record<string, { value: string; count: number }[]>,
        );

        return inputs.map(input => rowsGroupedByKey[input.key] ?? []);
      },
      {
        cacheKeyFn: JSON.stringify,
      },
    );

    return {
      loader,
    };
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
      operationTypes: filter?.operationTypes ?? null,
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
