import Dataloader from 'dataloader';
import { parseDateRangeInput } from '../../../shared/helpers';
import { ClickHouse, sql } from '../providers/clickhouse-client';
import { OperationsManager } from '../providers/operations-manager';
import { SqlValue } from '../providers/sql';
import type { TargetResolvers } from './../../../__generated__/types';

export const Target: Pick<
  TargetResolvers,
  | 'clientStats'
  | 'operation'
  | 'operationsStats'
  | 'requestsOverTime'
  | 'schemaCoordinateStats'
  | 'totalRequests'
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
    const clickhouse = injector.get(ClickHouse);
    const limit = (first ?? 10) + 1;

    const ANDs: SqlValue[] = [sql`target_id = ${target.id}`];

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

    const tracesQuery = await clickhouse.query<{
      target_id: string;
      trace_id: string;
      span_id: string;
      timestamp: string;
      operation_name: string;
      operation_type: string;
      duration: number;
      subgraph_names: string[];
      http_status_code: string;
      http_method: string;
      http_host: string;
      http_route: string;
      http_url: string;
    }>({
      query: sql`
        SELECT
          "target_id"
          , "trace_id"
          , "span_id"
          , "timestamp"
          , "http_status_code"
          , "http_method"
          , "http_host"
          , "http_route"
          , "http_url"
          , "duration"
          , "graphql_operation_name" AS "operation_name"
          , upper("graphql_operation_type") AS "operation_type"
          , "subgraph_names"
        FROM
          "otel_traces_normalized"
        WHERE ${sql.join(ANDs, ' AND ')}
        ORDER BY
          "timestamp" DESC
          , "trace_id" DESC
        LIMIT ${sql.raw(String(limit))}
      `,
      queryId: 'traces',
      timeout: 10_000,
    });

    const traces = tracesQuery.data;
    let hasNext = false;

    if (traces.length == limit) {
      hasNext = true;
      (traces as any).pop();
    }

    return {
      edges: traces.map(trace => {
        return {
          node: {
            id: trace.trace_id,
            timestamp: new Date(trace.timestamp),
            operationName: trace.operation_name,
            operationType: trace.operation_type as any,
            duration: trace.duration,
            subgraphs: trace.subgraph_names,
            success: trace.http_status_code === '200',
            clientName: null,
            clientVersion: null,
            httpStatusCode: Number(trace.http_status_code),
            httpMethod: trace.http_method,
            httpHost: trace.http_host,
            httpRoute: trace.http_route,
            httpUrl: trace.http_url,
          },
          cursor: Buffer.from(`${trace.timestamp}|${trace.trace_id}`).toString('base64'),
        };
      }),
      pageInfo: {
        hasNextPage: hasNext,
        hasPreviousPage: false,
        endCursor: traces.length
          ? Buffer.from(
              `${traces[traces.length - 1].timestamp}|${traces[traces.length - 1].trace_id}`,
            ).toString('base64')
          : '',
        startCursor: traces.length
          ? Buffer.from(`${traces[0].timestamp}|${traces[0].trace_id}`).toString('base64')
          : '',
      },
    };
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
};
