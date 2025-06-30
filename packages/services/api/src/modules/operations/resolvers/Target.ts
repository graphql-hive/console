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
  traces: async (target, { first, filter }, { injector }) => {
    return injector.get(Traces).findTracesForTargetId(target.id, first ?? null, {
      period: filter?.period ?? null,
      duration: filter?.duration
        ? {
            min: filter.duration.min ?? null,
            max: filter.duration.max ?? null,
          }
        : null,
    });
  },
  tracesFilterOptions: async (_parent, { filter }, { injector }) => {
    const ANDs: SqlValue[] = [sql`target_id = ${'target-1'}`];

    if (filter?.id?.length) {
      ANDs.push(sql`trace_id IN (${sql.array(filter.id, 'String')})`);
    }

    if (filter?.success?.length) {
      // ANDs.push(sql`http_status_code IN (${sql.array(filter.success.map((ok) => ok ? ).flat(1), 'String')})`);
      ANDs.push(
        sql`${sql.join(
          filter.success.map(ok =>
            ok
              ? // 2XX
                sql`(toUInt16OrZero(http_status_code) >= 200 AND toUInt16OrZero(http_status_code) < 300)`
              : // non-2XXX
                sql`(toUInt16OrZero(http_status_code) < 200 OR toUInt16OrZero(http_status_code) >= 300)`,
          ),
          ' OR ',
        )}`,
      );
    }

    if (filter?.operationName?.length) {
      ANDs.push(sql`graphql_operation_name IN (${sql.array(filter.operationName, 'String')})`);
    }

    if (filter?.operationType?.length) {
      ANDs.push(sql`graphql_operation_type IN (${sql.array(filter.operationType, 'String')})`);
    }

    if (filter?.subgraphs?.length) {
      ANDs.push(sql`hasAny(subgraph_names, (${sql.array(filter.subgraphs.flat(), 'String')}))`);
    }

    if (filter?.httpStatusCode?.length) {
      ANDs.push(
        sql`http_status_code IN (${sql.array(filter.httpStatusCode.map(String), 'UInt16')})`,
      );
    }

    if (filter?.httpMethod?.length) {
      ANDs.push(sql`http_method IN (${sql.array(filter.httpMethod, 'String')})`);
    }

    if (filter?.httpHost?.length) {
      ANDs.push(sql`http_host IN (${sql.array(filter.httpHost, 'String')})`);
    }

    if (filter?.httpRoute?.length) {
      ANDs.push(sql`http_route IN (${sql.array(filter.httpRoute, 'String')})`);
    }

    if (filter?.httpUrl?.length) {
      ANDs.push(sql`http_url IN (${sql.array(filter.httpUrl, 'String')})`);
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
              ${key} as key,
              toString(${sql.raw(columnExpression)}) AS value,
              count(*) AS count
            FROM otel_traces_normalized
            ${sql.raw(arrayJoinColumn ? `ARRAY JOIN ${arrayJoinColumn} as value` : '')}
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
    return injector.get(Traces).findTraceById(target.id, args.traceId);
  },
};
