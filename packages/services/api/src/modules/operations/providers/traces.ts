import DataLoader from 'dataloader';
import stableJSONStringify from 'fast-json-stable-stringify';
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
    sort: GraphQLSchema.TracesSortInput | null,
    cursorStr: string | null,
  ) {
    function createCursor(trace: Trace) {
      return Buffer.from(
        JSON.stringify({
          timestamp: trace.timestamp,
          traceId: trace.traceId,
          duration: sort?.sort === 'DURATION' ? trace.duration : undefined,
        } satisfies z.TypeOf<typeof PaginatedTraceCursorModel>),
      ).toString('base64');
    }

    function parseCursor(cursor: string) {
      const data = PaginatedTraceCursorModel.parse(
        JSON.parse(Buffer.from(cursor, 'base64').toString('utf8')),
      );
      if (sort?.sort === 'DURATION' && !data.duration) {
        throw new HiveError('Invalid cursor provided.');
      }
      return data;
    }

    await this._guardViewerCanAccessTraces(organizationId);
    const limit = first ?? 50;
    const cursor = cursorStr ? parseCursor(cursorStr) : null;

    // By default we order by timestamp DESC
    // In case a custom sort is provided, we order by duration asc/desc or timestamp asc
    const orderByFragment = sql`
      ${sort?.sort === 'DURATION' ? sql`"duration" ${sort.direction === 'ASC' ? sql`ASC` : sql`DESC`},` : sql``}
      "timestamp" ${sort?.sort === 'TIMESTAMP' && sort?.direction === 'ASC' ? sql`ASC` : sql`DESC`}
      , "trace_id" DESC
    `;

    let paginationSQLFragmentPart = sql``;

    if (cursor) {
      if (sort?.sort === 'DURATION') {
        const operator = sort.direction === 'ASC' ? sql`>` : sql`<`;
        const durationStr = String(cursor.duration);
        paginationSQLFragmentPart = sql`
          AND (
            "duration" ${operator} ${durationStr}
            OR (
              "duration" = ${durationStr}
              AND "timestamp" < ${cursor.timestamp}
            )
            OR (
              "duration" = ${durationStr}
              AND "timestamp" = ${cursor.timestamp}
              AND "trace_id" < ${cursor.traceId}
            )
          )
        `;
      } /* TIMESTAMP */ else {
        const operator = sort?.direction === 'ASC' ? sql`>` : sql`<`;
        paginationSQLFragmentPart = sql`
          AND (
            (
               "timestamp" = ${cursor.timestamp}
               AND "trace_id" < ${cursor.traceId}
            )
            OR "timestamp" ${operator} ${cursor.timestamp}
          )
        `;
      }
    }

    const sqlConditions = buildTraceFilterSQLConditions(filter, false);

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
          ${paginationSQLFragmentPart}
          ${filterSQLFragment}
        ORDER BY
          ${orderByFragment}
        LIMIT ${sql.raw(String(limit + 1))}
      `,
      queryId: 'traces',
      timeout: 10_000,
    });

    let traces = TraceListModel.parse(tracesQuery.data);
    const hasNext = traces.length > limit;
    traces = traces.slice(0, limit);

    return {
      edges: traces.map(trace => ({
        node: trace,
        cursor: createCursor(trace),
      })),
      pageInfo: {
        hasNextPage: hasNext,
        hasPreviousPage: false,
        endCursor: traces.length ? createCursor(traces[traces.length - 1]) : '',
        startCursor: traces.length ? createCursor(traces[0]) : '',
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

    const d = getBucketUnitAndCountNew(startDate, endDate);

    const [countStr, unit] = d.candidate.name.split(' ');

    const bucketStepFunctionName = {
      MINUTE: 'addMinutes',
      HOUR: 'addHours',
      DAY: 'addDays',
      WEEK: 'addWeeks',
      MONTH: 'addMonths',
    };

    const addIntervalFn = sql.raw(
      bucketStepFunctionName[unit as keyof typeof bucketStepFunctionName],
    );

    const result = await this.clickHouse.query<unknown>({
      query: sql`
        WITH "time_bucket_list" AS (
          SELECT
            ${addIntervalFn}(
              toStartOfInterval(
                toDateTime(${formatDate(startDate)}, 'UTC')
                , INTERVAL ${sql.raw(d.candidate.name)}
              )
              , ("number" + 1) * ${sql.raw(countStr)}
            ) AS "time_bucket"
          FROM
            "system"."numbers"
          WHERE "system"."numbers"."number" < ${String(d.buckets)}
        )
        SELECT
          replaceOne(concat(toDateTime64("time_bucket_list"."time_bucket", 9, 'UTC'), 'Z'), ' ', 'T') AS "timeBucketStart"
          , replaceOne(concat(
              toDateTime64(
                "time_bucket_list"."time_bucket"
                  + INTERVAL ${sql.raw(d.candidate.name)}
                  - INTERVAL 1 SECOND
                , 9
                , 'UTC'
              ) , 'Z') , ' ' , 'T'
            ) AS "timeBucketEnd"
          , coalesce("t"."ok_count_total", 0) as "okCountTotal"
          , coalesce("t"."error_count_total", 0) as "errorCountTotal"
          , coalesce("t"."ok_count_filtered", 0) as "okCountFiltered"
          , coalesce("t"."error_count_filtered", 0) as "errorCountFiltered"
        FROM
          "time_bucket_list"
        LEFT JOIN
        (
          SELECT
            toStartOfInterval("timestamp", INTERVAL ${sql.raw(d.candidate.name)}) AS "time_bucket_start"
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
            "time_bucket_start"
          ) AS "t"
        ON "t"."time_bucket_start" = "time_bucket_list"."time_bucket"
      `,
      queryId: `trace_status_breakdown_for_target_id_`,
      timeout: 10_000,
    });

    return TraceStatusBreakdownBucketList.parse(result.data);
  }

  async getTraceFilterOptions(targetId: string, filter: GraphQLSchema.TracesFilterInput | null) {
    return new TraceBreakdownLoader(this.logger, this.clickHouse, targetId, filter);
  }
}

export class TraceBreakdownLoader {
  private logger: Logger;
  private conditions: SqlValue[];
  private loader = new DataLoader<
    {
      key: string;
      limit: number | null;
    } & (
      | {
          columnExpression: string;
          arrayJoinColumn?: never;
        }
      | {
          columnExpression?: never;
          arrayJoinColumn: string;
        }
    ),
    { value: string; count: number }[],
    string
  >(
    async inputs => {
      const statements: SqlValue[] = [];
      const arrJoinColumnAlias = 'arr_join_column_value';

      for (const { key, columnExpression, limit, arrayJoinColumn } of inputs) {
        statements.push(sql`
          SELECT
            '${sql.raw(key)}' AS "key"
            , toString(${sql.raw(columnExpression ?? arrJoinColumnAlias)}) AS "value"
            , count(*) AS "count"
          FROM "otel_traces_normalized"
            ${sql.raw(arrayJoinColumn ? `ARRAY JOIN ${arrayJoinColumn} AS "${arrJoinColumnAlias}"` : '')}
          WHERE
            ${sql.join(this.conditions, ' AND ')}
          GROUP BY
            "value"
          ORDER BY
            "count" DESC
          ${sql.raw(limit ? `LIMIT ${limit}` : '')}
        `);
      }

      const query = sql`
        ${sql.join(statements, ' UNION ALL ')}
      `;

      const results = await this.clickhouse.query<{
        key: string;
        value: string;
        count: number;
      }>({
        query,
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
      cacheKeyFn: stableJSONStringify,
    },
  );

  constructor(
    logger: Logger,
    private clickhouse: ClickHouse,
    targetId: string,
    filter: GraphQLSchema.TracesFilterInput | null,
  ) {
    this.logger = logger.child({ source: 'TraceBreakdownLoader' });

    this.conditions = [sql`target_id = ${targetId}`];

    if (filter?.traceIds?.length) {
      this.conditions.push(sql`"trace_id" IN (${sql.array(filter.traceIds, 'String')})`);
    }

    if (filter?.success?.length) {
      const hasSuccess = filter.success.includes(true);
      const hasError = filter.success.includes(false);

      if (hasSuccess && !hasError) {
        this.conditions.push(
          sql`"graphql_error_count" = 0`,
          sql`substring("http_status_code", 1, 1) IN (${sql.array(['2', '3'], 'String')})`,
        );
      } else if (hasError && !hasSuccess) {
        this.conditions.push(
          sql`"graphql_error_count" > 0`,
          sql`substring("http_status_code", 1, 1) NOT IN (${sql.array(['2', '3'], 'String')})`,
        );
      }
    }

    if (filter?.operationNames?.length) {
      this.conditions.push(
        sql`"graphql_operation_name" IN (${sql.array(filter.operationNames, 'String')})`,
      );
    }

    if (filter?.operationTypes?.length) {
      this.conditions.push(
        sql`"graphql_operation_type" IN (${sql.array(
          filter.operationTypes.map(value => (value == null ? '' : value.toLowerCase())),
          'String',
        )})`,
      );
    }

    if (filter?.clientNames?.length) {
      this.conditions.push(sql`"client_name" IN (${sql.array(filter.clientNames, 'String')})`);
    }

    if (filter?.subgraphNames?.length) {
      this.conditions.push(
        sql`hasAny("subgraph_names", (${sql.array(filter.subgraphNames.flat(), 'String')}))`,
      );
    }

    if (filter?.httpStatusCodes?.length) {
      this.conditions.push(
        sql`"http_status_code" IN (${sql.array(filter.httpStatusCodes.map(String), 'UInt16')})`,
      );
    }

    if (filter?.httpMethods?.length) {
      this.conditions.push(sql`"http_method" IN (${sql.array(filter.httpMethods, 'String')})`);
    }

    if (filter?.httpHosts?.length) {
      this.conditions.push(sql`"http_host" IN (${sql.array(filter.httpHosts, 'String')})`);
    }

    if (filter?.httpRoutes?.length) {
      this.conditions.push(sql`"http_route" IN (${sql.array(filter.httpRoutes, 'String')})`);
    }

    if (filter?.httpUrls?.length) {
      this.conditions.push(sql`"http_url" IN (${sql.array(filter.httpUrls, 'String')})`);
    }
  }

  httpHost(top: number | null) {
    return this.loader.load({
      key: 'http_host',
      columnExpression: 'http_host',
      limit: top ?? 5,
    });
  }
  httpMethod(top: number | null) {
    return this.loader.load({
      key: 'http_method',
      columnExpression: 'http_method',
      limit: top ?? 5,
    });
  }
  httpRoute(top: number | null) {
    return this.loader.load({
      key: 'http_route',
      columnExpression: 'http_route',
      limit: top ?? 5,
    });
  }
  httpStatusCode(top: number | null) {
    return this.loader.load({
      key: 'http_status_code',
      columnExpression: 'http_status_code',
      limit: top ?? 5,
    });
  }
  httpUrl(top: number | null) {
    return this.loader.load({
      key: 'http_url',
      columnExpression: 'http_url',
      limit: top ?? 5,
    });
  }
  operationName(top: number | null) {
    return this.loader.load({
      key: 'graphql_operation_name',
      columnExpression: 'graphql_operation_name',
      limit: top ?? 5,
    });
  }
  operationType() {
    return this.loader.load({
      key: 'graphql_operation_type',
      columnExpression: 'graphql_operation_type',
      limit: null,
    });
  }
  subgraphs(top: number | null) {
    return this.loader.load({
      key: 'subgraph_names',
      limit: top ?? 5,
      arrayJoinColumn: 'subgraph_names',
    });
  }
  success() {
    return this.loader
      .load({
        key: 'success',
        columnExpression:
          'if((toUInt16OrZero(http_status_code) >= 200 AND toUInt16OrZero(http_status_code) < 300), true, false) AND "graphql_error_count" = 0',
        limit: null,
      })
      .then(data =>
        data.map(({ value, count }) => ({
          value: value === 'true' ? true : false,
          count,
        })),
      );
  }
  errorCode(top: number | null) {
    return this.loader.load({
      key: 'errorCode',
      limit: top ?? 10,
      arrayJoinColumn: 'graphql_error_codes',
    });
  }
  clientName(top: number | null) {
    return this.loader.load({
      key: 'client_name',
      columnExpression: 'client_name',
      limit: top ?? 10,
    });
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
  , "graphql_error_count" AS "graphqlErrorCount"
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
  graphqlOperationType: z
    .union([z.literal('QUERY'), z.literal('MUTATION'), z.literal('SUBSCRIPTION'), z.literal('')])
    .transform(value => value || null),
  graphqlOperationHash: z.string().nullable(),
  clientName: z.string().nullable(),
  clientVersion: z.string().nullable(),
  graphqlErrorCodes: z.array(z.string()).nullable(),
  graphqlErrorCount: z.number(),
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
  operationTypes: ReadonlyArray<string | null> | null;
  clientNames: ReadonlyArray<string> | null;
  subgraphNames: ReadonlyArray<string> | null;
  httpStatusCodes: ReadonlyArray<string> | null;
  httpMethods: ReadonlyArray<string> | null;
  httpHosts: ReadonlyArray<string> | null;
  httpRoutes: ReadonlyArray<string> | null;
  httpUrls: ReadonlyArray<string> | null;
};

function buildTraceFilterSQLConditions(filter: TraceFilter, skipPeriod: boolean) {
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
  timeBucketStart: z.string(),
  timeBucketEnd: z.string(),
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

type BucketCandidate = {
  name: string;
  seconds: number;
};

const bucketCanditates: Array<BucketCandidate> = [
  {
    name: '1 MINUTE',
    seconds: 60,
  },
  {
    name: '5 MINUTE',
    seconds: 60 * 5,
  },
  { name: '1 HOUR', seconds: 60 * 60 },
  { name: '4 HOUR', seconds: 60 * 60 * 4 },
  { name: '6 HOUR', seconds: 60 * 60 * 6 },
  { name: '1 DAY', seconds: 60 * 60 * 24 },
  { name: '1 WEEK', seconds: 60 * 60 * 24 * 7 },
  { name: '1 MONTH', seconds: 60 * 60 * 24 * 30 },
];

function getBucketUnitAndCountNew(startDate: Date, endDate: Date, targetBuckets: number = 50) {
  const diffSeconds = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);

  let best = {
    candidate: bucketCanditates[0],
    buckets: Math.floor(diffSeconds / bucketCanditates[0].seconds),
  };

  let bestDiff = Number.POSITIVE_INFINITY;

  for (const candidate of bucketCanditates) {
    const buckets = Math.floor(diffSeconds / candidate.seconds);

    const diff = Math.abs(buckets - targetBuckets);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = {
        candidate,
        buckets,
      };
    }
  }

  return best;
}

/**
 * All sortable fields (duration, timestamp), must be part of the cursor
 */
const PaginatedTraceCursorModel = z.object({
  traceId: z.string(),
  timestamp: z.string(),
  duration: z.number().optional(),
});
