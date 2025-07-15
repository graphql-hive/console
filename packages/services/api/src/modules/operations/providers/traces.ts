import { Injectable } from 'graphql-modules';
import { z } from 'zod';
import { subDays } from '@/lib/date-time';
import * as GraphQLSchema from '../../../__generated__/types';
import { HiveError } from '../../../shared/errors';
import { batch, parseDateRangeInput } from '../../../shared/helpers';
import { Logger } from '../../shared/providers/logger';
import { Storage } from '../../shared/providers/storage';
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
    private storage: Storage,
  ) {}

  async viewerCanAccessTraces(organizationId: string) {
    const organization = await this.storage.getOrganization({ organizationId });
    return organization.featureFlags.otelTracing;
  }

  private async _guardViewerCanAccessTraces(organizationId: string) {
    if (await this.viewerCanAccessTraces(organizationId)) {
      return;
    }
    throw new HiveError("You don't have acces to this feature.");
  }

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
  async findTraceById(
    organizationId: string,
    targetId: string,
    traceId: string,
  ): Promise<Trace | null> {
    await this._guardViewerCanAccessTraces(organizationId);
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

  async findSpansForTraceId(traceId: string, targetId: string): Promise<Array<Span>> {
    this.logger.debug('find spans for trace (traceId=%s)', traceId);
    const result = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          ${spanFields}
        FROM
          "otel_traces"
        WHERE
          "TraceId" = ${traceId}
          AND "SpanAttributes"['hive.target_id'] = ${targetId}
      `,
      timeout: 10_000,
      queryId: 'Traces.findSpansForTraceId',
    });

    return SpanListModel.parse(result.data);
  }

  async findTracesForTargetId(
    organizationId: string,
    targetId: string,
    first: number | null,
    filter: TraceFilter,
  ) {
    await this._guardViewerCanAccessTraces(organizationId);
    const limit = (first ?? 10) + 1;
    const sqlConditions = buildTraceFilterSQLConditions(filter);
    const filterSQLFragment = sqlConditions.length
      ? sql`AND ${sql.join(sqlConditions, ' AND ')}`
      : sql``;

    const tracesQuery = await this.clickHouse.query<unknown>({
      query: sql`
        SELECT
          ${traceFields}
        FROM
          "otel_traces_normalized"
        WHERE
          target_id = ${targetId}
          ${filterSQLFragment}
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

  async getTraceStatusBreakdownForTargetId(
    organizationId: string,
    targetId: string,
    filter: TraceFilter,
  ) {
    await this._guardViewerCanAccessTraces(organizationId);
    const sqlConditions = buildTraceFilterSQLConditions(filter, true);
    const filterSQLFragment = sqlConditions.length
      ? sql`AND ${sql.join(sqlConditions, ' AND ')}`
      : sql``;

    const endDate = filter.period?.to ?? new Date();
    const startDate = filter.period?.from ?? subDays(endDate, 14);

    const { unit, count: rangeUnits } = getBucketUnitAndCount(startDate, endDate);

    const bucketFunctionName = {
      minutes: 'MINUTE',
      hours: 'HOUR',
      days: 'DAY',
      weeks: 'WEEK',
      months: 'MONTH',
    };

    const bucketStepFunctionName = {
      minutes: 'addMinutes',
      hours: 'addHours',
      days: 'addDays',
      weeks: 'addWeeks',
      months: 'addMonths',
    };

    const result = await this.clickHouse.query<unknown>({
      query: sql`
        WITH "time_bucket_list" AS (
          SELECT
            ${sql.raw(bucketStepFunctionName[unit])}(toStartOfInterval(toDateTime(${formatDate(startDate)}, 'UTC'), INTERVAL 1 ${sql.raw(bucketFunctionName[unit])}), "number" + 1) AS "time_bucket"
          FROM
            "system"."numbers"
          WHERE "system"."numbers"."number" < ${String(rangeUnits)}
        )
        SELECT
          replaceOne(concat(toDateTime64("time_bucket_list"."time_bucket", 9, 'UTC'), 'Z'), ' ', 'T') AS "timeBucket"
          , coalesce("t"."ok_count_total", 0) as "okCountTotal"
          , coalesce("t"."error_count_total", 0) as "errorCountTotal"
          , coalesce("t"."ok_count_filtered", 0) as "okCountFiltered"
          , coalesce("t"."error_count_filtered", 0) as "errorCountFiltered"
        FROM
          "time_bucket_list"
        LEFT JOIN
        (
          SELECT
            toStartOfInterval("timestamp", INTERVAL 1 ${sql.raw(bucketFunctionName[unit])}) AS "time_bucket"
            , sumIf(1, "graphql_error_count" = 0) AS "ok_count_total"
            , sumIf(1, "graphql_error_count" != 0) AS "error_count_total"
            , sumIf(1, "graphql_error_count" = 0 ${filterSQLFragment}) AS "ok_count_filtered"
            , sumIf(1, "graphql_error_count" != 0 ${filterSQLFragment}) AS "error_count_filtered"
          FROM
            "otel_traces_normalized"
          WHERE
            "target_id" = ${targetId}
            AND "otel_traces_normalized"."timestamp" >= toDateTime(${formatDate(startDate)}, 'UTC')
            AND "otel_traces_normalized"."timestamp" <= toDateTime(${formatDate(endDate)}, 'UTC')
          GROUP BY
          "time_bucket"
          ) AS "t"
        ON "t"."time_bucket" = "time_bucket_list"."time_bucket"
      `,
      queryId: `trace_status_breakdown_for_target_id_${unit}_${rangeUnits}`,
      timeout: 10_000,
    });

    return TraceStatusBreakdownBucketList.parse(result.data);
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
  , "graphql_operation_document" AS "graphqlOperationDocument"
  , "graphql_operation_hash" AS "graphqlOperationHash"
  , "client_name" AS "clientName"
  , "client_version" AS "clientVersion"
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
  graphqlOperationHash: z.string().nullable(),
  clientName: z.string().nullable(),
  clientVersion: z.string().nullable(),
  graphqlErrorCodes: z.array(z.string()).nullable(),
  subgraphNames: z.array(z.string()).transform(s => (s.length === 1 && s.at(0) === '' ? [] : s)),
});

export type Trace = z.TypeOf<typeof TraceModel>;

const TraceListModel = z.array(TraceModel);

type TraceFilter = {
  period: null | GraphQLSchema.DateRangeInput;
  duration: {
    min: number | null;
    max: number | null;
  } | null;
  traceIds: ReadonlyArray<string> | null;
  success: ReadonlyArray<boolean> | null;
  errorCodes: ReadonlyArray<string> | null;
  operationNames: ReadonlyArray<string> | null;
  operationTypes: ReadonlyArray<string> | null;
  clientNames: ReadonlyArray<string> | null;
  subgraphNames: ReadonlyArray<string> | null;
  httpStatusCodes: ReadonlyArray<string> | null;
  httpMethods: ReadonlyArray<string> | null;
  httpHosts: ReadonlyArray<string> | null;
  httpRoutes: ReadonlyArray<string> | null;
  httpUrls: ReadonlyArray<string> | null;
};

function buildTraceFilterSQLConditions(filter: TraceFilter, skipPeriod = false) {
  const ANDs: SqlValue[] = [];

  if (filter?.period && !skipPeriod) {
    const period = parseDateRangeInput(filter.period);
    ANDs.push(
      sql`"otel_traces_normalized"."timestamp" >= toDateTime(${formatDate(period.from)}, 'UTC')`,
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

  if (filter?.errorCodes?.length) {
    ANDs.push(sql`hasAny("graphql_error_codes", (${sql.array(filter.errorCodes, 'String')}))`);
  }

  if (filter?.operationNames?.length) {
    ANDs.push(sql`"graphql_operation_name" IN (${sql.array(filter.operationNames, 'String')})`);
  }

  if (filter?.operationTypes?.length) {
    ANDs.push(sql`"graphql_operation_type" IN (${sql.array(filter.operationTypes, 'String')})`);
  }

  if (filter?.clientNames?.length) {
    ANDs.push(sql`"client_name" IN (${sql.array(filter.clientNames, 'String')})`);
  }

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

  return ANDs;
}

const IntFromString = z.string().transform(value => parseInt(value, 10));

const TraceStatusBreakdownBucket = z.object({
  timeBucket: z.string(),
  okCountTotal: IntFromString,
  errorCountTotal: IntFromString,
  okCountFiltered: IntFromString,
  errorCountFiltered: IntFromString,
});

const TraceStatusBreakdownBucketList = z.array(TraceStatusBreakdownBucket);

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
  , arrayMap(x -> replaceOne(concat(toDateTime64(x, 9, 'UTC'), 'Z'), ' ', 'T'),"Events.Timestamp") AS "eventsTimestamps"
  , "Events.Name" AS "eventsName"
  , "Events.Attributes" AS "eventsAttributes"
`;

const SpanModel = z
  .object({
    traceId: z.string(),
    spanId: z.string(),
    spanName: z.string(),
    resourceAttributes: z.record(z.string(), z.unknown()),
    spanAttributes: z.record(z.string(), z.unknown()),
    startDate: z.string(),
    endDate: z.string(),
    duration: z.string().transform(value => parseFloat(value)),
    parentSpanId: z.string().transform(value => value || null),
    eventsTimestamps: z.array(z.string()),
    eventsName: z.array(z.string()),
    eventsAttributes: z.array(z.record(z.string(), z.string())),
  })
  .transform(({ eventsTimestamps, eventsName, eventsAttributes, ...span }) => ({
    ...span,
    events: eventsTimestamps.map((date, index) => ({
      date,
      name: eventsName[index],
      attributes: eventsAttributes[index],
    })),
  }));

const SpanListModel = z.array(SpanModel);

export type Span = z.TypeOf<typeof SpanModel>;

type BucketResult = {
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'months';
  count: number;
};

function getBucketUnitAndCount(startDate: Date, endDate: Date): BucketResult {
  const MS_IN = {
    minute: 60 * 1000,
    hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
  };

  const diffMs = endDate.getTime() - startDate.getTime();
  const diffMinutes = diffMs / MS_IN.minute;

  let unit: BucketResult['unit'];
  let count: BucketResult['count'];

  if (diffMinutes <= 60) {
    unit = 'minutes';
    count = Math.ceil(diffMs / MS_IN.minute);
  } else if (diffMinutes <= 60 * 24) {
    unit = 'hours';
    count = Math.ceil(diffMs / MS_IN.hour);
  } else if (diffMinutes <= 60 * 24 * 30) {
    unit = 'days';
    count = Math.ceil(diffMs / MS_IN.day);
  } else if (diffMinutes <= 60 * 24 * 30 * 90) {
    unit = 'weeks';
    count = Math.ceil(diffMs / MS_IN.week);
  } else {
    unit = 'months';
    // Calculate full months difference:
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth();
    const endYear = endDate.getFullYear();
    const endMonth = endDate.getMonth();
    count = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  }

  return { unit, count };
}
