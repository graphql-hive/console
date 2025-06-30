import { Injectable } from 'graphql-modules';
import { z } from 'zod';
import { batch, parseDateRangeInput } from '@hive/api/shared/helpers';
import * as GraphQLSchema from '../../../__generated__/types';
import { Logger } from '../../shared/providers/logger';
import { ClickHouse, sql } from './clickhouse-client';
import { formatDate } from './operations-reader';
import { SqlValue } from './sql';

@Injectable({
  global: true,
})
export class Traces {
  constructor(
    private clickHouse: ClickHouse,
    private logger: Logger,
  ) {}

  private _findTraceByTraceId = batch<string, Trace | null>(async (traceIds: Array<string>) => {
    this.logger.debug('looking up traces by id (traceIds=%o)', traceIds);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          ${traceFields}
        FROM
          "otel_traces_normalized"
        WHERE
          "trace_id" IN (${sql.array(traceIds, 'String')})
        LIMIT 1 BY "trace_id"
      `,
      timeout: 10_000,
      queryId: 'Traces.findTraceByTraceId',
    });

    this.logger.debug('found %d traces', result.data.length);

    const lookupMap = new Map</* traceId */ string, Trace>();
    const traces = TraceListModel.parse(result.data);
    for (const trace of traces) {
      lookupMap.set(trace.traceId, trace);
    }

    return traceIds.map(traceId => Promise.resolve(lookupMap.get(traceId) ?? null));
  });

  /**
   * Find a specific trace by it's id.
   * Uses batching under the hood.
   */
  async findTraceById(targetId: string, traceId: string): Promise<Trace | null> {
    this.logger.debug('find trace by id (targetId=%s, traceId=%s)', targetId, traceId);
    const trace = await this._findTraceByTraceId(traceId);
    if (!trace) {
      this.logger.debug('could not find trace by id (targetId=%s, traceId=%s)', targetId, traceId);
      return null;
    }
    if (trace.targetId !== targetId) {
      this.logger.debug(
        'resolved trace target id does not match (targetId=%s, traceId=%s)',
        targetId,
        traceId,
      );
      return null;
    }

    this.logger.debug('trace found (targetId=%s, traceId=%s)', targetId, traceId);

    return trace;
  }

  async findSpansForTraceId(traceId: string): Promise<Array<Span>> {
    this.logger.debug('find spans for trace (traceId=%s)', traceId);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          ${spanFields}
        FROM
          "otel_traces"
        WHERE
          "TraceId" = ${traceId}
      `,
      timeout: 10_000,
      queryId: 'Traces.findSpansForTraceId',
    });

    console.log(result.data);

    return SpanListModel.parse(result.data);
  }

  async findTracesForTargetId(
    targetId: string,
    first: number | null,
    filter: {
      period: null | GraphQLSchema.DateRangeInput;
      duration: {
        min: number | null;
        max: number | null;
      } | null;
      traceIds: ReadonlyArray<string> | null;
      success: ReadonlyArray<boolean> | null;
      errorCodes: ReadonlyArray<string> | null;
      operationName?: Array<string>;
      operationType?: Array<string>;
      subgraphNames: ReadonlyArray<string> | null;
      httpStatusCodes: ReadonlyArray<string> | null;
      httpMethods: ReadonlyArray<string> | null;
      httpHosts: ReadonlyArray<string> | null;
      httpRoutes: ReadonlyArray<string> | null;
      httpUrls: ReadonlyArray<string> | null;
    },
  ) {
    const clickhouse = this.clickHouse;
    const limit = (first ?? 10) + 1;

    const ANDs: SqlValue[] = [sql`target_id = ${targetId}`];

    if (filter?.period) {
      const period = parseDateRangeInput(filter.period);
      ANDs.push(
        sql`"otel_traces_normalized"."timestamp" >= toDateTime(${formatDate(period.from)}, 'UTC')`,
      );
      ANDs.push(
        sql`"otel_traces_normalized"."timestamp" <= toDateTime(${formatDate(period.to)}, 'UTC')`,
      );
    }

    if (filter?.duration?.min) {
      ANDs.push(sql`"duration" >= ${String(filter.duration.min * 1_000 * 1_000)}`);
    }

    if (filter?.duration?.max) {
      ANDs.push(sql`"duration" <= ${String(filter.duration.max * 1_000 * 1_000)}`);
    }

    if (filter?.traceIds?.length) {
      ANDs.push(sql`"trace_id" IN (${sql.array(filter.traceIds, 'String')})`);
    }

    // Success based on GraphQL terms
    if (filter?.success?.length) {
      const hasSuccess = filter.success.includes(true);
      const hasError = filter.success.includes(false);

      if (hasSuccess && !hasError) {
        ANDs.push(sql`"graphql_error_count" = 0`);
        ANDs.push(sql`substring("http_status_code", 1, 1) IN (${sql.array(['2', '3'], 'String')})`);
      } else if (hasError && !hasSuccess) {
        ANDs.push(sql`"graphql_error_count" > 0`);
        ANDs.push(
          sql`substring("http_status_code", 1, 1) NOT IN (${sql.array(['2', '3'], 'String')})`,
        );
      }
    }

    if (filter?.errorCodes?.length) {
      ANDs.push(sql`hasAny("graphql_error_codes", (${sql.array(filter.errorCodes, 'String')}))`);
    }

    // if (filter?.operationName?.length) {
    //   ANDs.push(sql`graphql_operation_name IN (${sql.array(filter.operationName, 'String')})`);
    // }

    // if (filter?.operationType?.length) {
    //   ANDs.push(sql`graphql_operation_type IN (${sql.array(filter.operationType, 'String')})`);
    // }

    if (filter?.subgraphNames?.length) {
      ANDs.push(sql`hasAny("subgraph_names", (${sql.array(filter.subgraphNames, 'String')}))`);
    }

    if (filter?.httpStatusCodes?.length) {
      ANDs.push(sql`"http_status_code" IN (${sql.array(filter.httpStatusCodes, 'String')})`);
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

    const tracesQuery = await clickhouse.query<unknown>({
      query: sql`
        SELECT
          ${traceFields}
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

    const traces = TraceListModel.parse(tracesQuery.data);
    let hasNext = false;

    if (traces.length == limit) {
      hasNext = true;
      (traces as any).pop();
    }

    return {
      edges: traces.map(trace => {
        return {
          node: trace,
          cursor: Buffer.from(`${trace.timestamp}|${trace.traceId}`).toString('base64'),
        };
      }),
      pageInfo: {
        hasNextPage: hasNext,
        hasPreviousPage: false,
        endCursor: traces.length
          ? Buffer.from(
              `${traces[traces.length - 1].timestamp}|${traces[traces.length - 1].traceId}`,
            ).toString('base64')
          : '',
        startCursor: traces.length
          ? Buffer.from(`${traces[0].timestamp}|${traces[0].traceId}`).toString('base64')
          : '',
      },
    };
  }
}

const traceFields = sql`
  "target_id" AS "targetId"
  , "trace_id" AS "traceId"
  , "span_id" AS "spanId"
  , replaceOne(concat(toDateTime64("timestamp", 9, 'UTC'), 'Z'), ' ', 'T') AS "timestamp"
  , "http_status_code" AS "httpStatusCode"
  , "http_method" AS "httpMethod"
  , "http_host" AS "httpHost"
  , "http_route" AS "httpRoute"
  , "http_url" AS "httpUrl"
  , "duration"
  , "graphql_operation_name" AS "graphqlOperationName"
  , upper("graphql_operation_type") AS "graphqlOperationType"
  , "graphql_error_codes" AS "graphqlErrorCodes"
  , "subgraph_names" AS "subgraphNames"
`;

const TraceModel = z.object({
  traceId: z.string(),
  targetId: z.string().uuid(),
  spanId: z.string(),
  timestamp: z.string(),
  httpStatusCode: z.string(),
  httpMethod: z.string(),
  httpHost: z.string(),
  httpRoute: z.string(),
  httpUrl: z.string(),
  duration: z.string().transform(value => parseFloat(value)),
  graphqlOperationName: z
    .string()
    .nullable()
    .transform(value => value || null),
  graphqlOperationType: z.union([
    z.literal('QUERY'),
    z.literal('MUTATION'),
    z.literal('SUBSCRIPTION'),
  ]),
  graphqlErrorCodes: z.array(z.string()).nullable(),
  subgraphNames: z.array(z.string()).transform(s => (s.length === 1 && s.at(0) === '' ? [] : s)),
});

export type Trace = z.TypeOf<typeof TraceModel>;

const TraceListModel = z.array(TraceModel);

const spanFields = sql`
  "TraceId" AS "traceId"
  , "SpanId" AS "spanId"
  , "SpanName" AS "spanName"
  , "ResourceAttributes" AS "resourceAttributes"
  , "SpanAttributes" AS "spanAttributes"
  , replaceOne(concat(toDateTime64("Timestamp", 9, 'UTC'), 'Z'), ' ', 'T') AS "startDate"
  , replaceOne(concat(toDateTime64(addNanoseconds("Timestamp", "Duration"), 9, 'UTC'), 'Z'), ' ', 'T') AS "endDate"
  , "Duration" AS "duration"
  , "ParentSpanId" AS "parentSpanId"
`;

const SpanModel = z.object({
  traceId: z.string(),
  spanId: z.string(),
  spanName: z.string(),
  resourceAttributes: z.record(z.string(), z.unknown()),
  spanAttributes: z.record(z.string(), z.unknown()),
  startDate: z.string(),
  endDate: z.string(),
  duration: z.string().transform(value => parseFloat(value)),
  parentSpanId: z.string().transform(value => value || null),
});

const SpanListModel = z.array(SpanModel);

export type Span = z.TypeOf<typeof SpanModel>;
