import { Inject, Injectable, Optional } from 'graphql-modules';
import * as z from 'zod';
import { UTCDate } from '@date-fns/utc';
import {
  buildCoordinateScopeCondition,
  buildOperationsFilterSQLConditions,
  convertHash,
  formatDateTime,
  hashList,
  parseDateTime,
  RawValue,
  SqlValue,
  type HashEncoding,
} from '@hive/clickhouse';
import { traceFn } from '@hive/service-common';
import type { DateRange } from '../../../shared/entities';
import { batch, batchBy } from '../../../shared/helpers';
import { Logger } from '../../shared/providers/logger';
import { toEndOfInterval, toStartOfInterval } from '../lib/date-time-helpers';
import { pickTableByPeriod } from '../lib/pick-table-by-provider';
import { ClickHouse, RowOf, sql } from './clickhouse-client';
import { calculateTimeWindow } from './helpers';
import { CLICKHOUSE_CONFIG, type ClickHouseConfig } from './tokens';

const CoordinateClientNamesGroupModel = z.array(
  z.object({
    coordinate: z.string(),
    client_names: z.array(z.string()),
  }),
);

export const formatDate = formatDateTime;

function toUnixTimestamp(utcDate: string): number {
  return parseDateTime(utcDate).getTime();
}

export interface DurationMetrics {
  avg: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

const ReadOperationModel = z.object({
  target: z.uuid(),
  hash: z.string(),
  body: z.string(),
  name: z.string(),
  type: z.union([z.literal('QUERY'), z.literal('MUTATION'), z.literal('SUBSCRIPTION')]),
});

export enum FieldMetricsState {
  /**
   * If the field metric usage data is in sync with other usage data, then the visualization can be shown as intended
   * with all the data and no explanation needed.
   */
  IN_SYNC,

  /**
   * If the field metric usage data and operation metric data did not start at the same time, then this requires an
   * explanation for why the data does not align. Display a warning on the UI.
   */
  HISTORY_MISSING,

  /**
   * If the field metric usage data is not available, because the gateway has never installed the necessary plugin,
   * then we can safely hide this feature on the frontend.
   */
  NO_DATA,
}

type Operation = z.TypeOf<typeof ReadOperationModel>;

function toDurationMetrics(percentiles: [number, number, number, number], avg: number) {
  return {
    avg,
    p75: percentiles[0],
    p90: percentiles[1],
    p95: percentiles[2],
    p99: percentiles[3],
  };
}

function ensureNumber(value: number | string): number {
  if (typeof value === 'number') {
    return value;
  }

  return parseFloat(value);
}

/** The single-coordinate Insights pages scope exactly like a one-coordinate Fields filter. */
function withCoordinate(
  scopes: ReadonlyArray<readonly string[]> | undefined,
  schemaCoordinate: string | undefined,
): ReadonlyArray<readonly string[]> {
  return schemaCoordinate ? [...(scopes ?? []), [schemaCoordinate]] : (scopes ?? []);
}

type Granularity = 'daily' | 'hourly' | 'minutely';

type AggregationTable =
  | 'operations'
  | 'clients'
  | 'coordinates'
  | 'coordinate_counts'
  | 'coordinate_errors';

/**
 * Which `operations_by_graph*` table a query needs:
 * - `hash`: `operations_by_graph_hash_client_*` (operation hash, client name and client version)
 * - `client`: `operations_by_graph_client_*` (client name and client version, no hash)
 * - `graph`: `operations_by_graph_*` (target, graph and time only)
 */
export type OperationsRollupDimensions = 'hash' | 'client' | 'graph';

/**
 * `graph_id` of usage reported without graph metadata (e.g. by SDKs that predate graphs).
 * Such usage belongs to the default graph of the target.
 */
export const UNATTRIBUTED_GRAPH_ID = '00000000-0000-0000-0000-000000000000';

export type GraphSelector = {
  graphId: string;
  /** The default graph also owns the usage reported without graph metadata. */
  isDefaultGraph: boolean;
};

export type GraphFilter = GraphSelector & {
  /**
   * Whether the query reads the graph-scoped (`*_by_graph_*`) rollups
   * (see the `useGraphRollups` context of `pickAggregationByPeriod`).
   * The legacy rollups have no `graph_id` column.
   */
  useGraphRollups: boolean;
};

function graphKey(graph: GraphSelector | null | undefined): string {
  return graph ? `${graph.graphId}:${graph.isDefaultGraph}` : '';
}

/**
 * - graph-scoped rollups: filter by `graph_id`
 * - legacy rollups and the default graph: no condition, all legacy usage belongs to the default graph
 * - legacy rollups and a contract graph: match nothing, contract graphs have no legacy usage
 */
export function buildGraphConditions(graph: GraphFilter, namespace?: string): SqlValue[] {
  if (!graph.useGraphRollups) {
    return graph.isDefaultGraph ? [] : [sql`1 = 0`];
  }

  const column = sql.raw(namespace ? `${namespace}.graph_id` : 'graph_id');

  if (graph.isDefaultGraph) {
    return [sql`${column} IN (${sql.array([UNATTRIBUTED_GRAPH_ID, graph.graphId], 'String')})`];
  }

  return [sql`${column} = ${graph.graphId}`];
}

/**
 * `buildGraphConditions` as `AND ...` for queries that build their `PREWHERE` by hand.
 * Empty without a graph or without conditions.
 */
function andGraphConditions(graph: GraphFilter | null, namespace?: string): SqlValue {
  const conditions = graph ? buildGraphConditions(graph, namespace) : [];
  return conditions.length ? sql`AND ${sql.join(conditions, ' AND ')}` : sql``;
}

/**
 * The graph-scoped rollups (`*_by_graph_*`) are only complete for data ingested after they were
 * created, so they are only read for periods starting at or after the configured cutoff.
 */
export function shouldUseGraphRollups(
  period: DateRange | null,
  graphRollupsStart: Date | undefined,
): boolean {
  return !!(period && graphRollupsStart && period.from >= graphRollupsStart);
}

/**
 * How the table read for `table` stores the operation hash. The graph-scoped rollups store it
 * binary, so do the legacy `coordinate_counts_*` / `coordinate_errors_*`. The other legacy rollups
 * store the hex `String`, like `operation_collection_*` and `subscription_operations_*`.
 */
export function hashEncodingOf(table: AggregationTable, useGraphRollups: boolean): HashEncoding {
  if (table === 'coordinate_counts' || table === 'coordinate_errors') {
    return 'binary';
  }
  return useGraphRollups ? 'binary' : 'hex';
}

/** Picks the narrowest `operations_by_graph*` table that can serve the given filters. */
export function operationsRollupDimensions(args: {
  operations?: readonly string[];
  clients?: readonly string[];
  clientVersionFilters?: readonly unknown[];
  coordinateScopes?: ReadonlyArray<readonly string[]>;
  schemaCoordinate?: string;
  requiresHash?: boolean;
}): OperationsRollupDimensions {
  if (
    args.requiresHash ||
    args.operations?.length ||
    args.coordinateScopes?.length ||
    args.schemaCoordinate
  ) {
    return 'hash';
  }

  return args.clients?.length || args.clientVersionFilters?.length ? 'client' : 'graph';
}

function rollupTableName(args: {
  table: AggregationTable;
  granularity: Granularity;
  useGraphRollups: boolean;
  operationsDimensions: OperationsRollupDimensions;
}): RawValue {
  const { table, granularity } = args;

  if (!args.useGraphRollups) {
    return sql.raw(`${table}_${granularity}`);
  }

  switch (table) {
    case 'operations': {
      const dimensions =
        args.operationsDimensions === 'hash'
          ? '_hash_client'
          : args.operationsDimensions === 'client'
            ? '_client'
            : '';
      return sql.raw(`operations_by_graph${dimensions}_${granularity}`);
    }
    // `operations_by_graph_hash_client_*` stores the same dimensions as the legacy `clients_*` tables.
    case 'clients':
      return sql.raw(`operations_by_graph_hash_client_${granularity}`);
    default:
      return sql.raw(`${table}_by_graph_${granularity}`);
  }
}

@Injectable({
  global: true,
})
export class OperationsReader {
  constructor(
    private clickHouse: ClickHouse,
    private logger: Logger,
    @Optional() @Inject(CLICKHOUSE_CONFIG) private clickHouseConfig?: ClickHouseConfig,
  ) {}

  private useGraphRollups(period: DateRange | null): boolean {
    return shouldUseGraphRollups(period, this.clickHouseConfig?.graphRollupsStart);
  }

  /** The graph-scoped rollups store t-digest quantile states. */
  private durationQuantilesMerge(period: DateRange | null): RawValue {
    return sql.raw(this.useGraphRollups(period) ? 'quantilesTDigestMerge' : 'quantilesMerge');
  }

  /**
   * Resolves the graph filter of a query that is not routed through `pickAggregationByPeriod`.
   * `useGraphRollups` is false for queries that read legacy tables only.
   */
  private graphFilter(
    graph: GraphSelector | null | undefined,
    useGraphRollups: boolean,
  ): GraphFilter | null {
    return graph ? { ...graph, useGraphRollups } : null;
  }

  /** Graph filter for tables resolved with `rollupTable(..., period)`. */
  private graphFilterForPeriod(
    graph: GraphSelector | null | undefined,
    period: DateRange | null,
  ): GraphFilter | null {
    return this.graphFilter(graph, this.useGraphRollups(period));
  }

  /** Hash encoding of tables resolved with `rollupTable(..., period)`. */
  private hashEncoding(table: AggregationTable, period: DateRange | null): HashEncoding {
    return hashEncodingOf(table, this.useGraphRollups(period));
  }

  /** Table to read when a query is not routed through `pickAggregationByPeriod`. */
  private rollupTable(
    table: AggregationTable,
    granularity: Granularity,
    period: DateRange | null,
    operationsDimensions: OperationsRollupDimensions = 'hash',
  ): RawValue {
    return rollupTableName({
      table,
      granularity,
      useGraphRollups: this.useGraphRollups(period),
      operationsDimensions,
    });
  }

  private pickAggregationByPeriod(args: {
    period: DateRange | null;
    /** Restricts to the usage of a graph, exposed to `query` as `context.graph`. */
    graph?: GraphSelector | null;
    resolution?: number;
    timeout:
      | {
          daily: number;
          hourly: number;
          minutely: number;
        }
      | number;
    query(
      /**
       * Resolves the table for the picked granularity. Uses the graph-scoped rollups if the period
       * starts after the configured cutoff. `operationsDimensions` selects the `operations_by_graph*`
       * variant and defaults to the one with all dimensions.
       */
      aggregationTableName: (
        tableName: AggregationTable,
        operationsDimensions?: OperationsRollupDimensions,
      ) => RawValue,
      /**
       * `useGraphRollups` is true if the graph-scoped rollups are read,
       * which is required for filtering by graph.
       * `graph` is the graph filter to pass to `createFilter` (null without `args.graph`).
       * `hashEncoding` is how the table resolved for a given `AggregationTable` stores `hash`.
       */
      context: {
        useGraphRollups: boolean;
        graph: GraphFilter | null;
        hashEncoding: (table: AggregationTable) => HashEncoding;
      },
    ): SqlValue;
    queryId(aggregation: Granularity): `${string}_${typeof aggregation}`;
  }) {
    const timeout =
      typeof args.timeout === 'number'
        ? { daily: args.timeout, hourly: args.timeout, minutely: args.timeout }
        : args.timeout;
    let { period, resolution } = args;
    const useGraphRollups = this.useGraphRollups(period);
    const context = {
      useGraphRollups,
      graph: this.graphFilter(args.graph, useGraphRollups),
      hashEncoding: (table: AggregationTable) => hashEncodingOf(table, useGraphRollups),
    };
    const tableNameResolver =
      (granularity: Granularity) =>
      (table: AggregationTable, operationsDimensions: OperationsRollupDimensions = 'hash') =>
        rollupTableName({ table, granularity, useGraphRollups, operationsDimensions });

    const queryMap = {
      daily: {
        query: args.query(tableNameResolver('daily'), context),
        queryId: args.queryId('daily'),
        timeout: timeout.daily,
      },
      hourly: {
        query: args.query(tableNameResolver('hourly'), context),
        queryId: args.queryId('hourly'),
        timeout: timeout.hourly,
      },
      minutely: {
        query: args.query(tableNameResolver('minutely'), context),
        queryId: args.queryId('minutely'),
        timeout: timeout.minutely,
      },
    };

    if (!period) {
      return {
        ...queryMap.daily,
        queryType: 'daily' as const,
      };
    }

    if (resolution && (resolution < 1 || resolution > 90)) {
      throw new Error('Invalid resolution provided.');
    }

    const now = new UTCDate();
    const interval = resolution ? calculateTimeWindow({ period, resolution }) : null;

    const resolvedTable = pickTableByPeriod({
      now,
      period,
      intervalUnit: interval?.unit,
      logger: this.logger,
    });

    return {
      ...queryMap[resolvedTable],
      queryType: resolvedTable,
    };
  }

  async readMonthlyUsage({ organization }: { organization: string }) {
    const result = await this.clickHouse.query<{
      date: string;
      total: number;
    }>({
      query: sql`
        SELECT
          date,
          sum(total) as total
        FROM monthly_overview
        WHERE organization = ${organization}
        GROUP BY date
        ORDER BY date ASC
        WITH FILL
          FROM toStartOfMonth(now() - INTERVAL 11 MONTHS)
          TO toStartOfMonth(now())
          STEP INTERVAL 1 MONTH
      `,
      queryId: 'read_monthly_usage',
      timeout: 10_000,
    });

    return result.data.map(row => ({
      date: row.date,
      total: ensureNumber(row.total),
    }));
  }

  async countField({
    type,
    field,
    argument,
    target,
    period,
    graph,
  }: {
    type: string;
    field?: string;
    argument?: string;
    target: string;
    period: DateRange;
    graph?: GraphSelector | null;
  }) {
    return this.countFields({
      target,
      period,
      graph,
      fields: [{ type, field, argument }],
    }).then(r => r[this.makeId({ type, field, argument })]);
  }

  countCoordinateResolutions = batchBy<
    {
      schemaCoordinate: string;
      targetIds: readonly string[];
      period: DateRange;
      operations?: readonly string[];
      excludedClients?: readonly string[] | null;
      graph?: GraphSelector | null;
    },
    Record<string, number>
  >(
    item =>
      `${item.targetIds.join(',')}-${item.excludedClients?.join(',') ?? ''}-${item.operations?.join(',') ?? ''}-${item.period.from.toISOString()}-${item.period.to.toISOString()}-${graphKey(item.graph)}`,
    async items => {
      const schemaCoordinates = items.map(item => item.schemaCoordinate);
      return await this.countCoordinateResolution({
        targetIds: items[0].targetIds,
        excludedClients: items[0].excludedClients,
        period: items[0].period,
        operations: items[0].operations,
        graph: items[0].graph,
        schemaCoordinates,
      }).then(result =>
        items.map(item =>
          Promise.resolve({ [item.schemaCoordinate]: result[item.schemaCoordinate] }),
        ),
      );
    },
  );

  /**
   * Eliminates rows of operations used only by the excluded clients. Coordinates are connected to
   * clients through the operation hash.
   *
   * Must be built inside `pickAggregationByPeriod` with the `clients` table and graph filter of the
   * outer query: the clients table must have the same granularity as the outer table, since the
   * `period` filter otherwise drops its rows (e.g. daily rows are at `00:00`, which a period starting
   * later that day excludes, so nothing would be excluded at all).
   *
   * With `perTarget`, an operation is only dropped for the targets only excluded clients used it in.
   */
  private excludedClientsConditions({
    excludedClients,
    targetIds,
    period,
    graph,
    clientsTable,
    clientsHashEncoding,
    hashEncoding,
    perTarget = false,
  }: {
    excludedClients: readonly string[] | null | undefined;
    targetIds: string | readonly string[];
    period: DateRange;
    graph: GraphFilter | null;
    clientsTable: RawValue;
    clientsHashEncoding: HashEncoding;
    /** How the outer table stores `hash`. */
    hashEncoding: HashEncoding;
    perTarget?: boolean;
  }): SqlValue[] {
    if (!excludedClients?.length) {
      return [];
    }

    const hash = convertHash(sql.raw('hash'), clientsHashEncoding, hashEncoding);
    const key = sql.raw(perTarget ? 'hash, target' : 'hash');

    return [
      sql`
        (${key}) NOT IN (
          SELECT ${hash}${sql.raw(perTarget ? ', target' : '')} FROM (
            SELECT
              ${key},
              countIf(client_name NOT IN (${sql.array(
                excludedClients,
                'String',
              )})) as non_excluded_clients_total
            FROM ${clientsTable} ${this.createFilter({
              target: targetIds,
              period,
              graph,
            })}
            GROUP BY ${key}
          ) WHERE non_excluded_clients_total = 0
        )
      `,
    ];
  }

  /**
   * Count the number of resolutions for a coordinate.
   */
  public async countCoordinateResolution({
    schemaCoordinates,
    targetIds,
    period,
    operations,
    excludedClients,
    graph,
  }: {
    schemaCoordinates: readonly string[];
    targetIds: string | readonly string[];
    period: DateRange;
    operations?: readonly string[];
    excludedClients?: readonly string[] | null;
    graph?: GraphSelector | null;
  }) {
    const conditions = [sql`(coordinate IN (${sql.array(schemaCoordinates, 'String')}))`];

    const query = this.pickAggregationByPeriod({
      period,
      graph,
      query: (aggregationTableName, ctx) => sql`
            SELECT
              coordinate,
              sum(total) as total
            FROM ${aggregationTableName('coordinate_counts')}
            ${this.createFilter({
              target: targetIds,
              period,
              operations,
              hashEncoding: ctx.hashEncoding('coordinate_counts'),
              graph: ctx.graph,
              extra: [
                ...conditions,
                ...this.excludedClientsConditions({
                  excludedClients,
                  targetIds,
                  period,
                  graph: ctx.graph,
                  clientsTable: aggregationTableName('clients'),
                  clientsHashEncoding: ctx.hashEncoding('clients'),
                  hashEncoding: ctx.hashEncoding('coordinate_counts'),
                }),
              ],
            })}
            GROUP BY coordinate
          `,
      queryId: aggregation => `count_fields_v2_${aggregation}`,
      timeout: 30_000,
    });

    const res = await this.clickHouse.query<{
      total: string;
      coordinate: string;
    }>(query);

    const stats: Record<string, number> = {};
    for (const row of res.data) {
      stats[row.coordinate] = ensureNumber(row.total);
    }

    for (const coordinate of schemaCoordinates) {
      if (typeof stats[coordinate] !== 'number') {
        stats[coordinate] = 0;
      }
    }

    return stats;
  }

  countCoordinate = batchBy<
    {
      schemaCoordinate: string;
      targetIds: readonly string[];
      period: DateRange;
      operations?: readonly string[];
      excludedClients?: readonly string[] | null;
      graph?: GraphSelector | null;
    },
    Record<string, number>
  >(
    item =>
      `${item.targetIds.join(',')}-${item.excludedClients?.join(',') ?? ''}-${item.operations?.join(',') ?? ''}-${item.period.from.toISOString()}-${item.period.to.toISOString()}-${graphKey(item.graph)}`,
    async items => {
      const schemaCoordinates = items.map(item => item.schemaCoordinate);
      return await this.countCoordinates({
        targetIds: items[0].targetIds,
        excludedClients: items[0].excludedClients,
        period: items[0].period,
        operations: items[0].operations,
        graph: items[0].graph,
        schemaCoordinates,
      }).then(result =>
        items.map(item =>
          Promise.resolve({ [item.schemaCoordinate]: result[item.schemaCoordinate] }),
        ),
      );
    },
  );

  /**
   * Can count the number of requests hitting a coordinate.
   */
  public async countCoordinates({
    schemaCoordinates,
    targetIds,
    period,
    operations,
    excludedClients,
    graph,
  }: {
    schemaCoordinates: readonly string[];
    targetIds: string | readonly string[];
    period: DateRange;
    operations?: readonly string[];
    excludedClients?: readonly string[] | null;
    graph?: GraphSelector | null;
  }) {
    const conditions = [sql`(coordinate IN (${sql.array(schemaCoordinates, 'String')}))`];

    const query = this.pickAggregationByPeriod({
      period,
      graph,
      query: (aggregationTableName, ctx) => sql`
            SELECT
              coordinate,
              sum(total) as total
            FROM ${aggregationTableName('coordinates')}
            ${this.createFilter({
              target: targetIds,
              period,
              operations,
              hashEncoding: ctx.hashEncoding('coordinates'),
              graph: ctx.graph,
              extra: [
                ...conditions,
                ...this.excludedClientsConditions({
                  excludedClients,
                  targetIds,
                  period,
                  graph: ctx.graph,
                  clientsTable: aggregationTableName('clients'),
                  clientsHashEncoding: ctx.hashEncoding('clients'),
                  hashEncoding: ctx.hashEncoding('coordinates'),
                }),
              ],
            })}
            GROUP BY coordinate
          `,
      queryId: aggregation => `count_fields_v2_${aggregation}`,
      timeout: 30_000,
    });

    const res = await this.clickHouse.query<{
      total: string;
      coordinate: string;
    }>(query);

    const stats: Record<string, number> = {};
    for (const row of res.data) {
      stats[row.coordinate] = ensureNumber(row.total);
    }

    for (const coordinate of schemaCoordinates) {
      if (typeof stats[coordinate] !== 'number') {
        stats[coordinate] = 0;
      }
    }

    return stats;
  }

  /** `countCoordinate` split by target, with the distinct operations behind each. */
  countCoordinatePerTarget = batchBy<
    {
      schemaCoordinate: string;
      targetIds: readonly string[];
      period: DateRange;
      excludedClients?: readonly string[] | null;
      graph?: GraphSelector | null;
    },
    Array<{ id: string; count: number; operationCount: number }>
  >(
    item =>
      `${item.targetIds.join(',')}-${item.excludedClients?.join(',') ?? ''}-${item.period.from.toISOString()}-${item.period.to.toISOString()}-${graphKey(item.graph)}`,
    async items => {
      const counts = await this.countCoordinatesPerTarget({
        targetIds: items[0].targetIds,
        excludedClients: items[0].excludedClients,
        period: items[0].period,
        graph: items[0].graph,
        schemaCoordinates: items.map(item => item.schemaCoordinate),
      });
      return items.map(item => counts.get(item.schemaCoordinate) ?? []);
    },
  );

  private async countCoordinatesPerTarget(args: {
    schemaCoordinates: readonly string[];
    targetIds: readonly string[];
    period: DateRange;
    excludedClients?: readonly string[] | null;
    graph?: GraphSelector | null;
  }) {
    const conditions = [sql`(coordinate IN (${sql.array(args.schemaCoordinates, 'String')}))`];

    const query = this.pickAggregationByPeriod({
      period: args.period,
      graph: args.graph,
      query: (aggregationTableName, ctx) => sql`
            SELECT
              coordinate,
              target,
              sum(total) as total,
              uniqExact(hash) as operations
            FROM ${aggregationTableName('coordinates')}
            ${this.createFilter({
              target: args.targetIds,
              period: args.period,
              graph: ctx.graph,
              extra: [
                ...conditions,
                // Per target, so a target only excluded clients used does not count as used.
                ...this.excludedClientsConditions({
                  excludedClients: args.excludedClients,
                  targetIds: args.targetIds,
                  period: args.period,
                  graph: ctx.graph,
                  clientsTable: aggregationTableName('clients'),
                  clientsHashEncoding: ctx.hashEncoding('clients'),
                  hashEncoding: ctx.hashEncoding('coordinates'),
                  perTarget: true,
                }),
              ],
            })}
            GROUP BY coordinate, target
          `,
      queryId: aggregation => `count_coordinates_per_target_${aggregation}`,
      timeout: 30_000,
    });

    const res = await this.clickHouse.query<{
      total: string;
      operations: string;
      coordinate: string;
      target: string;
    }>(query);

    return groupByKey(
      res.data.map(row => ({
        key: row.coordinate,
        id: row.target,
        count: ensureNumber(row.total),
        operationCount: ensureNumber(row.operations),
      })),
    );
  }

  getOperationCountsPerTarget = batchBy<
    {
      hash: string;
      targetIds: readonly string[];
      period: DateRange;
      excludedClients?: readonly string[] | null;
      graph?: GraphSelector | null;
    },
    Array<{ id: string; count: number }>
  >(
    item =>
      `${item.targetIds.join(',')}-${item.excludedClients?.join(',') ?? ''}-${item.period.from.toISOString()}-${item.period.to.toISOString()}-${graphKey(item.graph)}`,
    async items => {
      const counts = await this._getOperationCountsPerTarget({
        targetIds: items[0].targetIds,
        excludedClients: items[0].excludedClients ?? null,
        period: items[0].period,
        graph: items[0].graph,
        hashes: Array.from(new Set(items.map(item => item.hash))),
      });
      return items.map(item => counts.get(item.hash) ?? []);
    },
  );

  private async _getOperationCountsPerTarget(args: {
    targetIds: readonly string[];
    excludedClients: null | readonly string[];
    period: DateRange;
    hashes: string[];
    graph?: GraphSelector | null;
  }) {
    const operationsHashEncoding = this.hashEncoding('operations', args.period);
    const filter = (table: string, graph: GraphFilter | null, hashEncoding: HashEncoding) => sql`
      PREWHERE
        ${sql.raw(`"${table}"`)}."target" IN (${sql.array(args.targetIds, 'String')})
        AND ${sql.raw(`"${table}"`)}."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
        AND ${sql.raw(`"${table}"`)}."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
        AND ${sql.raw(`"${table}"`)}."hash" IN (${hashList(args.hashes, hashEncoding, { long: true })})
        ${args.excludedClients ? sql`AND ${sql.raw(`"${table}"`)}."client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
        ${andGraphConditions(graph, `"${table}"`)}
    `;

    const rows = await this.clickHouse
      .postQuery({
        queryId: '_getOperationCountsPerTarget',
        query: sql`
          SELECT "hex_hash" AS "hash", "target", SUM("total") AS "count"
          FROM (
            SELECT ${convertHash(sql.raw('"operations"."hash"'), operationsHashEncoding, 'hex')} AS "hex_hash", toString("operations"."target") AS "target", "operations"."total" AS "total"
            FROM ${this.rollupTable('operations', 'daily', args.period)} AS "operations"
            ${filter('operations', this.graphFilterForPeriod(args.graph, args.period), operationsHashEncoding)}

            UNION ALL

            SELECT "subscription_operations_daily"."hash" AS "hex_hash", toString("subscription_operations_daily"."target") AS "target", "subscription_operations_daily"."total" AS "total"
            FROM "subscription_operations_daily"
            ${filter('subscription_operations_daily', this.graphFilter(args.graph, false), 'hex')}
          )
          GROUP BY "hex_hash", "target"
        `,
        timeout: 10_000,
      })
      .then(result =>
        z
          .array(
            z.object({
              hash: z.string(),
              target: z.string(),
              count: z.string().transform(ensureNumber),
            }),
          )
          .parse(result.data),
      );

    return groupByKey(rows.map(row => ({ key: row.hash, id: row.target, count: row.count })));
  }

  countCoordinateFailure = batchBy<
    {
      schemaCoordinate: string;
      targetIds: readonly string[];
      period: DateRange;
      operations?: readonly string[];
      excludedClients?: readonly string[] | null;
      graph?: GraphSelector | null;
    },
    Record<string, number>
  >(
    item =>
      `${item.targetIds.join(',')}-${item.excludedClients?.join(',') ?? ''}-${item.operations?.join(',') ?? ''}-${item.period.from.toISOString()}-${item.period.to.toISOString()}-${graphKey(item.graph)}`,
    async items => {
      const schemaCoordinates = items.map(item => item.schemaCoordinate);
      return await this.countCoordinateFailures({
        targetIds: items[0].targetIds,
        excludedClients: items[0].excludedClients,
        period: items[0].period,
        operations: items[0].operations,
        graph: items[0].graph,
        schemaCoordinates,
      }).then(result =>
        items.map(item =>
          Promise.resolve({ [item.schemaCoordinate]: result[item.schemaCoordinate] }),
        ),
      );
    },
  );

  public async countCoordinateFailures({
    schemaCoordinates,
    targetIds,
    period,
    operations,
    excludedClients,
    graph,
  }: {
    schemaCoordinates: readonly string[];
    targetIds: string | readonly string[];
    period: DateRange;
    operations?: readonly string[];
    excludedClients?: readonly string[] | null;
    graph?: GraphSelector | null;
  }) {
    const conditions = [sql`(coordinate IN (${sql.array(schemaCoordinates, 'String')}))`];

    const query = this.pickAggregationByPeriod({
      period,
      graph,
      query: (aggregationTableName, ctx) => sql`
        SELECT
          coordinate,
          sum(total_errors) as total
        FROM ${aggregationTableName('coordinate_errors')}
        ${this.createFilter({
          target: targetIds,
          period,
          operations,
          hashEncoding: ctx.hashEncoding('coordinate_errors'),
          graph: ctx.graph,
          extra: [
            ...conditions,
            ...this.excludedClientsConditions({
              excludedClients,
              targetIds,
              period,
              graph: ctx.graph,
              clientsTable: aggregationTableName('clients'),
              clientsHashEncoding: ctx.hashEncoding('clients'),
              hashEncoding: ctx.hashEncoding('coordinate_errors'),
            }),
          ],
        })}
        GROUP BY coordinate
      `,
      queryId: aggregation => `count_failure_fields_v1_${aggregation}`,
      timeout: 30_000,
    });

    const res = await this.clickHouse.query<{
      total: string;
      coordinate: string;
    }>(query);

    const stats: Record<string, number> = {};
    for (const row of res.data) {
      stats[row.coordinate] = ensureNumber(row.total);
    }

    for (const coordinate of schemaCoordinates) {
      if (typeof stats[coordinate] !== 'number') {
        stats[coordinate] = 0;
      }
    }

    return stats;
  }

  private async countFields({
    fields,
    target,
    period,
    operations,
    excludedClients,
    graph,
  }: {
    fields: ReadonlyArray<{
      type: string;
      field?: string | null;
      argument?: string | null;
    }>;
    target: string | readonly string[];
    period: DateRange;
    operations?: readonly string[];
    excludedClients?: readonly string[] | null;
    graph?: GraphSelector | null;
  }): Promise<Record<string, number>> {
    const schemaCoordinates = fields.map(selector => this.makeId(selector));
    return this.countCoordinates({
      schemaCoordinates,
      targetIds: target,
      period,
      operations,
      excludedClients,
      graph,
    });
  }

  async hasCollectedOperations({
    target,
  }: {
    target: string | readonly string[];
  }): Promise<boolean> {
    const result = await this.clickHouse.query<{
      exists: number;
    }>({
      query: sql`
        SELECT
          1 AS "exists"
        FROM
          "target_existence"
        ${this.createFilter({
          target,
        })}
        GROUP BY "target"
        LIMIT 1

        UNION DISTINCT

        SELECT
          1 AS "exists"
        FROM
          "subscription_target_existence"
        ${this.createFilter({
          target,
        })}
        GROUP BY "target"
        LIMIT 1
      `,
      queryId: 'has_collected_operations',
      timeout: 10_000,
    });

    return result.rows > 0;
  }

  async getHasCollectedSubscriptionOperations(args: { target: string }) {
    const result = await this.clickHouse.query<{
      exists: number;
    }>({
      query: sql`
        SELECT
          1 AS "exists"
        FROM
          "subscription_target_existence"
        ${this.createFilter({
          target: args.target,
        })}
        GROUP BY "target"
        LIMIT 1
      `,
      queryId: 'has_collected_subscription_operations',
      timeout: 10_000,
    });

    return result.rows > 0;
  }

  async countOperationsWithoutDetails({
    target,
    period,
    graph,
  }: {
    target: string | readonly string[];
    period: DateRange;
    graph?: GraphSelector | null;
  }): Promise<number> {
    const query = this.pickAggregationByPeriod({
      period,
      graph,
      timeout: {
        daily: 30_000,
        hourly: 15_000,
        minutely: 10_000,
      },
      query: (aggregationTableName, ctx) =>
        sql`SELECT sum(total) as total FROM ${aggregationTableName('operations', 'graph')} ${this.createFilter(
          {
            target,
            period,
            graph: ctx.graph,
          },
        )}`,
      queryId: aggregation => `count_operations_${aggregation}`,
    });

    const result = await this.clickHouse.query<{
      total: number;
    }>(query);

    const total = ensureNumber(result.data[0].total);

    return total;
  }

  /** Read the statistics of fields for a given list of targets in a period. */
  async readFieldListStats(args: {
    targetIds: readonly string[];
    period: DateRange;
    excludedClients: readonly string[] | null;
    graph?: GraphSelector | null;
    fields: readonly {
      type: string;
      field?: string | null;
      argument?: string | null;
    }[];
  }) {
    const [totalFields, total] = await Promise.all([
      this.countFields({
        fields: args.fields,
        target: args.targetIds,
        period: args.period,
        excludedClients: args.excludedClients,
        graph: args.graph,
      }),
      this.countOperationsWithoutDetails({
        target: args.targetIds,
        period: args.period,
        graph: args.graph,
      }),
    ]);

    return Object.keys(totalFields).map(id => {
      const [type, field, argument] = id.split('.');
      const totalField = totalFields[id] ?? 0;

      return {
        type,
        field,
        argument,
        period: args.period,
        count: totalField,
        percentage: total === 0 ? 0 : (totalField / total) * 100,
      };
    });
  }

  async countRequests({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
    schemaCoordinate,
  }: {
    target: string | readonly string[];
    period: DateRange;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
    schemaCoordinate?: string;
  }): Promise<{
    total: number;
    ok: number;
    notOk: number;
  }> {
    const operationsDimensions = operationsRollupDimensions({
      operations,
      clients,
      clientVersionFilters,
      coordinateScopes,
      schemaCoordinate,
    });
    const query = this.pickAggregationByPeriod({
      graph,
      timeout: {
        minutely: 10_000,
        hourly: 15_000,
        daily: 30_000,
      },
      queryId: aggregation => `count_operations_${aggregation}`,
      query: (aggregationTableName, ctx) =>
        sql`SELECT sum(total) as total, sum(total_ok) as totalOk FROM ${aggregationTableName('operations', operationsDimensions)} ${this.createFilter(
          {
            graph: ctx.graph,
            target,
            period,
            operations,
            hashEncoding: ctx.hashEncoding('operations'),
            clients,
            clientVersionFilters,
            excludeOperations,
            excludeClientVersionFilters,
            coordinateScope: {
              table: aggregationTableName('coordinates'),
              scopes: withCoordinate(coordinateScopes, schemaCoordinate),
            },
          },
        )}`,
      period,
    });

    const result = await this.clickHouse.query<{
      total: number;
      totalOk: number;
    }>(query);

    const total = ensureNumber(result.data[0].total);
    const totalOk = ensureNumber(result.data[0].totalOk);

    return {
      total,
      ok: totalOk,
      notOk: total - totalOk,
    };
  }

  async countFailures({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
  }: {
    target: string;
    period: DateRange;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
  }): Promise<number> {
    return this.countRequests({
      target,
      period,
      operations,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
      graph,
    }).then(r => r.notOk);
  }

  async countUniqueDocuments({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
  }: {
    target: string;
    period: DateRange;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
  }): Promise<number> {
    const query = this.pickAggregationByPeriod({
      graph,
      period,
      timeout: {
        daily: 30_000,
        hourly: 15_000,
        minutely: 10_000,
      },
      query: (aggregationTableName, ctx) =>
        sql`SELECT count(distinct hash) as total FROM ${aggregationTableName('operations')} ${this.createFilter(
          {
            graph: ctx.graph,
            target,
            period,
            operations,
            hashEncoding: ctx.hashEncoding('operations'),
            clients,
            clientVersionFilters,
            excludeOperations,
            excludeClientVersionFilters,
            coordinateScope: {
              table: aggregationTableName('coordinates'),
              scopes: coordinateScopes ?? [],
            },
          },
        )}`,
      queryId: aggregation => `count_unique_documents_${aggregation}`,
    });

    const result = await this.clickHouse.query<{
      total: string;
    }>(query);

    return result.data.length ? parseInt(result.data[0].total, 10) : 0;
  }

  async readUniqueDocuments({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
    schemaCoordinate,
  }: {
    target: string;
    period: DateRange;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
    schemaCoordinate?: string;
  }): Promise<
    Array<{
      operationHash: string;
      operationName: string;
      kind: string;
      count: number;
      countOk: number;
      percentage: number;
    }>
  > {
    const query = this.pickAggregationByPeriod({
      graph,
      period,
      timeout: {
        daily: 30_000,
        hourly: 15_000,
        minutely: 10_000,
      },
      query: (aggregationTableName, ctx) =>
        sql`SELECT total, totalOk, ${convertHash(sql.raw('hash'), ctx.hashEncoding('operations'), 'hex')} AS hash FROM (SELECT sum(total) as total, sum(total_ok) as totalOk, hash FROM ${aggregationTableName(
          'operations',
        )} ${this.createFilter({
          graph: ctx.graph,
          target,
          period,
          operations,
          hashEncoding: ctx.hashEncoding('operations'),
          clients,
          clientVersionFilters,
          excludeOperations,
          excludeClientVersionFilters,
          coordinateScope: {
            table: aggregationTableName('coordinates'),
            scopes: withCoordinate(coordinateScopes, schemaCoordinate),
          },
        })} GROUP BY hash)`,
      queryId: aggregation => `read_unique_documents_${aggregation}`,
    });

    const [operationsResult, registryResult] = await Promise.all([
      this.clickHouse.query<{
        total: string;
        totalOk: string;
        hash: string;
      }>(query),
      this.clickHouse.query<{
        name?: string;
        hash: string;
        operation_kind: string;
      }>({
        query: sql`
          SELECT
            name,
            hash,
            operation_kind
          FROM operation_collection_details
            ${this.createFilter({
              target,
              extra: [
                sql`
                  hash IN (
                    SELECT ${convertHash(sql.raw('hash'), this.hashEncoding('operations', period), 'hex')}
                    FROM ${this.rollupTable('operations', query.queryType, period)}
                    ${this.createFilter({
                      target,
                      period,
                      graph: this.graphFilterForPeriod(graph, period),
                      operations,
                      hashEncoding: this.hashEncoding('operations', period),
                      clientVersionFilters,
                      excludeOperations,
                      excludeClientVersionFilters,
                      coordinateScope: {
                        table: this.rollupTable('coordinates', query.queryType, period),
                        scopes: withCoordinate(coordinateScopes, schemaCoordinate),
                      },
                    })}
                    GROUP BY hash
                  )
                `,
              ],
            })}
          GROUP BY name, hash, operation_kind
        `,
        queryId: 'operations_registry_' + query.queryType,
        timeout: 15_000,
      }),
    ]);

    const total = operationsResult.data.reduce((sum, row) => sum + parseInt(row.total, 10), 0);

    const operationsMap = new Map<string, RowOf<typeof registryResult>>();

    for (const row of registryResult.data) {
      operationsMap.set(row.hash, row);
    }

    return operationsResult.data.map(row => {
      const rowTotal = parseInt(row.total, 10);
      const rowTotalOk = parseInt(row.totalOk, 10);
      const op = operationsMap.get(row.hash);
      const { name, operation_kind } = op ?? {
        name: 'missing',
        operation_kind: 'missing',
      };

      return {
        operationName: `${row.hash.substr(0, 4)}_${name ?? 'anonymous'}`,
        operationHash: row.hash,
        kind: operation_kind,
        count: rowTotal,
        countOk: rowTotalOk,
        percentage: (rowTotal / total) * 100,
      };
    });
  }

  readOperation = batch<{ targetIds: Array<string>; hash: string }, Operation | null>(
    async args => {
      const allTargetIds = Array.from(new Set(args.flatMap(arg => arg.targetIds)));
      const hashes = Array.from(new Set(args.map(arg => arg.hash)));

      const result = await this.clickHouse.query<unknown>({
        query: sql`
        SELECT
          "operation_collection_details"."target" AS "target",
          "operation_collection_details"."hash" AS "hash",
          upper("operation_collection_details"."operation_kind") AS "type",
          "operation_collection_details"."name" AS "name",
          "body_join"."body" AS "body"
        FROM "operation_collection_details"
        RIGHT JOIN (
          SELECT
            "operation_collection_body"."target" AS "target",
            "operation_collection_body"."hash" AS "hash",
            "operation_collection_body"."body" AS "body"
          FROM "operation_collection_body"
            ${this.createFilter({
              target: allTargetIds,
              extra: [sql`"operation_collection_body"."hash" IN (${sql.array(hashes, 'String')})`],
              namespace: 'operation_collection_body',
            })}
          LIMIT 1
            BY
              "operation_collection_body"."target",
              "operation_collection_body"."hash"
        ) AS "body_join"
          ON "operation_collection_details"."hash" = "body_join"."hash"
          ${this.createFilter({
            target: allTargetIds,
            extra: [sql`"operation_collection_details"."hash" IN (${sql.array(hashes, 'String')})`],
            namespace: 'operation_collection_details',
          })}
        LIMIT 1
          BY
            "operation_collection_details"."target" AS "target",
            "operation_collection_details"."hash"
        SETTINGS allow_asynchronous_read_from_io_pool_for_merge_tree = 1
      `,
        queryId: 'read_body',
        timeout: 10_000,
      });

      const lookupMap = new Map<string, Operation>(
        result.data.map(row => {
          const record = ReadOperationModel.parse(row);
          return [`${record.target}/${record.hash}`, record];
        }),
      );

      return args.map(async arg => {
        for (const targetId of arg.targetIds) {
          const operation = lookupMap.get(`${targetId}/${arg.hash}`);
          if (operation) {
            return operation;
          }
        }
        return null;
      });
    },
  );

  async getReportedSchemaCoordinates({
    target,
    period,
    graph,
  }: {
    target: string;
    period: DateRange;
    graph?: GraphSelector | null;
  }): Promise<Set<string>> {
    const result = await this.clickHouse.query<{
      coordinate: string;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
          SELECT
            coordinate
          FROM ${aggregationTableName('coordinates')}
            ${this.createFilter({
              graph: ctx.graph,
              target,
              period,
            })}
          WHERE coordinate NOT ILIKE '%.__typename'
          GROUP BY coordinate
        `,
        queryId: aggregation => `reported_schema_coordinates_${aggregation}`,
        timeout: 10_000,
        period,
      }),
    );

    return new Set(result.data.map(row => row.coordinate));
  }

  async countUniqueClients({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
    schemaCoordinate,
  }: {
    target: string;
    period: DateRange;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
    schemaCoordinate?: string;
  }): Promise<
    Array<{
      name: string;
      count: number;
      percentage: number;
      versions: Array<{
        version: string;
        count: number;
        percentage: number;
      }>;
    }>
  > {
    const result = await this.clickHouse.query<{
      total: string;
      client_name: string;
      client_version: string;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
              SELECT
                sum(total) as total,
                client_name,
                client_version
              FROM ${aggregationTableName('clients')}
              ${this.createFilter({
                graph: ctx.graph,
                target,
                period,
                operations,
                hashEncoding: ctx.hashEncoding('clients'),
                clients,
                clientVersionFilters,
                excludeOperations,
                excludeClientVersionFilters,
                coordinateScope: {
                  table: aggregationTableName('coordinates'),
                  scopes: withCoordinate(coordinateScopes, schemaCoordinate),
                },
              })}
              GROUP BY client_name, client_version
              ORDER BY total DESC
            `,
        queryId: aggregation => `count_clients_${aggregation}`,
        timeout: 10_000,
        period,
      }),
    );

    const total = result.data.reduce((sum, row) => sum + parseInt(row.total, 10), 0);

    const clientMap = new Map<
      string,
      {
        name: string;
        total: number;
        versions: Array<{
          total: number;
          version: string;
        }>;
      }
    >();

    for (const row of result.data) {
      const client_name = !row.client_name ? 'unknown' : row.client_name;
      const client_version = !row.client_version ? 'unknown' : row.client_version;

      if (!clientMap.has(client_name)) {
        clientMap.set(client_name, {
          name: client_name,
          total: 0,
          versions: [],
        });
      }

      const client = clientMap.get(client_name)!;

      client.total += ensureNumber(row.total);
      client.versions.push({
        total: ensureNumber(row.total),
        version: client_version,
      });
    }

    return Array.from(clientMap.values()).map(client => {
      return {
        name: client.name,
        versions: client.versions.map(version => ({
          version: version.version,
          count: version.total,
          percentage: (version.total / client.total) * 100,
        })),
        count: client.total,
        percentage: (client.total / total) * 100,
      };
    });
  }

  async readClientVersions({
    target,
    period,
    clientName,
    limit,
    graph,
  }: {
    target: string;
    period: DateRange;
    clientName: string;
    limit: number;
    graph?: GraphSelector | null;
  }): Promise<{ version: string; count: number; percentage: number }[]> {
    const result = await this.clickHouse.query<{
      total: string;
      client_version: string;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
              SELECT
                sum(total) as total,
                client_version
              FROM ${aggregationTableName('clients')}
              ${this.createFilter({
                graph: ctx.graph,
                target,
                period,
                clients: clientName === 'unknown' ? [clientName, ''] : [clientName],
              })}
              GROUP BY client_version
              ORDER BY total DESC
              LIMIT ${sql.raw(limit.toString())}
            `,
        queryId: aggregation => `read_client_versions_${aggregation}`,
        timeout: 10_000,
        period,
      }),
    );

    const total = result.data.reduce((sum, row) => sum + parseInt(row.total, 10), 0);

    return result.data.map(row => {
      const versionTotal = ensureNumber(row.total);
      return {
        version: row.client_version || 'unknown',
        count: versionTotal,
        percentage: (versionTotal / total) * 100,
      };
    });
  }

  /** Get the total amount of requests for a list of targets for a period. */
  async getTotalAmountOfRequests(args: {
    targetIds: readonly string[];
    excludedClients: null | readonly string[];
    period: DateRange;
    graph?: GraphSelector | null;
  }) {
    const TotalCountModel = z
      .tuple([z.object({ amountOfRequests: z.string() })])
      .transform(data => ensureNumber(data[0].amountOfRequests));

    return await this.clickHouse
      .query<unknown>({
        queryId: 'getTotalCountForSchemaCoordinates',
        query: sql`
          SELECT
            SUM("result"."total") AS "amountOfRequests"
          FROM (
            SELECT
              SUM("operations"."total") AS "total"
            FROM
              ${this.rollupTable('operations', 'daily', args.period, args.excludedClients ? 'client' : 'graph')} AS "operations"
            PREWHERE
              "operations"."target" IN (${sql.array(args.targetIds, 'String')})
              AND "operations"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
              AND "operations"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
              ${args.excludedClients ? sql`AND "operations"."client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
              ${andGraphConditions(this.graphFilterForPeriod(args.graph, args.period), '"operations"')}

            UNION ALL

            SELECT
              SUM("subscription_operations_daily"."total") AS "total"
            FROM
              "subscription_operations_daily"
            PREWHERE
              "subscription_operations_daily"."target" IN (${sql.array(args.targetIds, 'String')})
              AND "subscription_operations_daily"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
              AND "subscription_operations_daily"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
              ${args.excludedClients ? sql`AND "subscription_operations_daily"."client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
              ${andGraphConditions(this.graphFilter(args.graph, false), '"subscription_operations_daily"')}
          ) AS "result"
          `,
        timeout: 10_000,
      })
      .then(result => TotalCountModel.parse(result.data));
  }

  /** Result array retains the order of the input `args.schemaCoordinates`. */
  private async _getTopOperationsForSchemaCoordinates(args: {
    targetIds: readonly string[];
    excludedClients: null | readonly string[];
    period: DateRange;
    schemaCoordinates: string[];
    graph?: GraphSelector | null;
  }) {
    const rollupGraph = this.graphFilterForPeriod(args.graph, args.period);
    // `subscription_operations_daily` has no graph dimension
    const legacyGraph = this.graphFilter(args.graph, false);
    // `coordinates` and `operations` share the encoding, `subscription_operations_daily` is hex
    const hashEncoding = this.hashEncoding('coordinates', args.period);

    const RecordArrayType = z.array(
      z.object({
        coordinate: z.string(),
        hash: z.string(),
        name: z.string(),
        count: z.string().transform(ensureNumber),
      }),
    );

    this.logger.debug('Fetching top operations for schema coordinates (args=%o)', args);

    /**
     * top_operations_by_coordinates -> get the top operations for schema coordinates, we need to right join operations_daily as coordinates_daily does not contain the client_names column
     */
    const results = await this.clickHouse
      .postQuery({
        queryId: '_getTopOperationsForSchemaCoordinates',
        query: sql`
          WITH "top_operations_by_coordinates" AS (
            SELECT DISTINCT
              "coordinates"."coordinate" AS "coordinate",
              ${convertHash(sql.raw('"coordinates"."hash"'), hashEncoding, 'hex')} AS "hash",
              "operations_join"."total" AS "total"
            FROM
              ${this.rollupTable('coordinates', 'daily', args.period)} AS "coordinates"
            RIGHT JOIN (
              SELECT
                "operations"."hash",
                SUM("operations"."total") AS "total"
              FROM
                ${this.rollupTable('operations', 'daily', args.period)} AS "operations"
              PREWHERE
                "target" IN (${sql.array(args.targetIds, 'String')})
                AND "timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
                AND "timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
                ${andGraphConditions(rollupGraph)}
                ${args.excludedClients ? sql`AND "client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
              GROUP BY
                "hash"

              UNION ALL

              SELECT
                ${convertHash(sql.raw('"subscription_operations_daily"."hash"'), 'hex', hashEncoding)} AS "hash",
                SUM("subscription_operations_daily"."total") AS "total"
              FROM
                "subscription_operations_daily"
              PREWHERE
                "target" IN (${sql.array(args.targetIds, 'String')})
                AND "timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
                AND "timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
                ${andGraphConditions(legacyGraph)}
                ${args.excludedClients ? sql`AND "client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
              GROUP BY
                "hash"
            ) AS "operations_join" ON "coordinates"."hash" = "operations_join"."hash"
            PREWHERE
              "coordinates"."target" IN (${sql.array(args.targetIds, 'String')})
              AND "coordinates"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
              AND "coordinates"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
              ${andGraphConditions(rollupGraph, '"coordinates"')}
              AND "coordinates"."coordinate" IN (${sql.longArray(args.schemaCoordinates, 'String')})
            ORDER BY
              "total" DESC,
              "coordinates"."hash" DESC
            LIMIT 10
              BY "coordinates"."coordinate"
          )
          SELECT
            "top_operations_by_coordinates"."coordinate" AS "coordinate",
            "top_operations_by_coordinates"."hash" AS "hash",
            "operation_names"."name" AS "name",
            "top_operations_by_coordinates"."total" AS "count"
          FROM
            "top_operations_by_coordinates"
          LEFT JOIN (
            SELECT
              "operation_collection_details"."name",
              "operation_collection_details"."hash"
            FROM
              "operation_collection_details"
            PREWHERE
              "operation_collection_details"."target" IN (${sql.array(args.targetIds, 'String')})
              AND "operation_collection_details"."hash" IN (SELECT DISTINCT "hash" FROM "top_operations_by_coordinates")
            LIMIT 1
            BY "operation_collection_details"."hash"
          ) AS "operation_names"
            ON "operation_names"."hash" = "top_operations_by_coordinates"."hash"
          ORDER BY
            "top_operations_by_coordinates"."coordinate" DESC,
            "top_operations_by_coordinates"."total" DESC
          `,
        timeout: 10_000,
      })
      .then(result => RecordArrayType.parse(result.data));

    const operationsBySchemaCoordinate = new Map<
      string,
      Array<{
        hash: string;
        name: string;
        count: number;
      }>
    >();

    for (const result of results) {
      let records = operationsBySchemaCoordinate.get(result.coordinate);
      if (!records) {
        records = [];
        operationsBySchemaCoordinate.set(result.coordinate, records);
      }
      records.push({
        hash: result.hash,
        name: result.name,
        count: result.count,
      });
    }

    return args.schemaCoordinates.map(
      schemaCoordinate => operationsBySchemaCoordinate.get(schemaCoordinate) ?? null,
    );
  }

  /** Get the top operations for a given schema coordinate (uses batch loader underneath). */
  getTopOperationsForSchemaCoordinate = batchBy<
    {
      targetIds: readonly string[];
      excludedClients: null | readonly string[];
      period: DateRange;
      schemaCoordinate: string;
      graph?: GraphSelector | null;
    },
    Array<{
      hash: string;
      name: string;
      count: number;
    }> | null
  >(
    item =>
      `${item.targetIds.join(',')}-${item.excludedClients?.join(',') ?? ''}-${item.period.from.toISOString()}-${item.period.to.toISOString()}-${graphKey(item.graph)}`,
    async items => {
      const schemaCoordinates = items.map(item => item.schemaCoordinate);
      return await this._getTopOperationsForSchemaCoordinates({
        targetIds: items[0].targetIds,
        excludedClients: items[0].excludedClients,
        period: items[0].period,
        graph: items[0].graph,
        schemaCoordinates,
      }).then(result => result.map(result => Promise.resolve(result)));
    },
  );

  /** Result array retains the order of the input `args.schemaCoordinates`. */
  private async _getTopClientsForSchemaCoordinates(args: {
    targetIds: readonly string[];
    excludedClients: null | readonly string[];
    period: DateRange;
    schemaCoordinates: string[];
    graph?: GraphSelector | null;
  }) {
    const rollupGraph = this.graphFilterForPeriod(args.graph, args.period);
    // `subscription_operations_daily` has no graph dimension
    const legacyGraph = this.graphFilter(args.graph, false);
    // `coordinates` and `operations` share the encoding, `subscription_operations_daily` is hex
    const hashEncoding = this.hashEncoding('coordinates', args.period);

    const RecordArrayType = z.array(
      z.object({
        coordinate: z.string(),
        name: z.string(),
        count: z.string().transform(ensureNumber),
      }),
    );

    this.logger.debug('Fetching top clients for schema coordinates (args=%o)', args);

    const results = await this.clickHouse
      .postQuery({
        queryId: '_getTopClientsForSchemaCoordinates',
        query: sql`
          WITH "coordinates_to_client_name_mapping" AS (
           SELECT
              "coordinates"."coordinate" AS "coordinate",
              "operations_daily_filtered"."client_name" AS "client_name"
            FROM
              ${this.rollupTable('coordinates', 'daily', args.period)} AS "coordinates"
            LEFT JOIN (
              SELECT
                "operations"."hash",
                "operations"."client_name"
              FROM
                ${this.rollupTable('operations', 'daily', args.period)} AS "operations"
              PREWHERE
                "operations"."target" IN (${sql.array(args.targetIds, 'String')})
                AND "operations"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
                AND "operations"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
                ${andGraphConditions(rollupGraph, '"operations"')}
                ${args.excludedClients ? sql`AND "operations"."client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
              LIMIT 1
                BY
                  "operations"."hash",
                  "operations"."client_name"

              UNION ALL

              SELECT
                ${convertHash(sql.raw('"subscription_operations_daily"."hash"'), 'hex', hashEncoding)} AS "hash",
                "subscription_operations_daily"."client_name"
              FROM
                "subscription_operations_daily"
              PREWHERE
                "subscription_operations_daily"."target" IN (${sql.array(args.targetIds, 'String')})
                AND "subscription_operations_daily"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
                AND "subscription_operations_daily"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
                ${andGraphConditions(legacyGraph, '"subscription_operations_daily"')}
                ${args.excludedClients ? sql`AND "subscription_operations_daily"."client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
              LIMIT 1
                BY
                  "subscription_operations_daily"."hash",
                  "subscription_operations_daily"."client_name"
            ) AS "operations_daily_filtered"
               ON "operations_daily_filtered"."hash" = "coordinates"."hash"
            PREWHERE
              "coordinates"."target" IN (${sql.array(args.targetIds, 'String')})
              AND "coordinates"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
              AND "coordinates"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
              ${andGraphConditions(rollupGraph, '"coordinates"')}
              AND "coordinates"."coordinate" IN (${sql.longArray(args.schemaCoordinates, 'String')})
            LIMIT 1
            BY
              "coordinates"."coordinate",
              "operations_daily_filtered"."client_name"
          )

        SELECT
          "result"."coordinate" AS "coordinate",
          "result"."name" AS "name",
          SUM("result"."count") AS "count"
        FROM (
          SELECT
            "coordinates_to_client_name_mapping"."coordinate" AS "coordinate",
            "clients"."client_name" AS "name",
            "clients"."total" AS "count"
          FROM
            ${this.rollupTable('clients', 'daily', args.period)} AS "clients"
          LEFT JOIN
            "coordinates_to_client_name_mapping"
            ON "clients"."client_name" = "coordinates_to_client_name_mapping"."client_name"
          PREWHERE
            "clients"."target" IN (${sql.array(args.targetIds, 'String')})
            AND "clients"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
            AND "clients"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
            ${andGraphConditions(rollupGraph, '"clients"')}
            ${args.excludedClients ? sql`AND "clients"."client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}

          UNION ALL

          SELECT
            "coordinates_to_client_name_mapping"."coordinate" AS "coordinate",
            "subscription_operations_daily"."client_name" AS "name",
            "subscription_operations_daily"."total" AS "count"
          FROM
            "subscription_operations_daily"
          LEFT JOIN
            "coordinates_to_client_name_mapping"
            ON "subscription_operations_daily"."client_name" = "coordinates_to_client_name_mapping"."client_name"
          PREWHERE
            "subscription_operations_daily"."target" IN (${sql.array(args.targetIds, 'String')})
            AND "subscription_operations_daily"."timestamp" >= toDateTime(${formatDate(args.period.from)}, 'UTC')
            AND "subscription_operations_daily"."timestamp" <= toDateTime(${formatDate(args.period.to)}, 'UTC')
            ${andGraphConditions(legacyGraph, '"subscription_operations_daily"')}
            ${args.excludedClients ? sql`AND "subscription_operations_daily"."client_name" NOT IN (${sql.array(args.excludedClients, 'String')})` : sql``}
        ) AS "result"
        GROUP BY
          "result"."coordinate",
          "result"."name"
        ORDER BY
          SUM("result"."count") DESC
        LIMIT 10
        BY
          "result"."coordinate",
          "result"."name"
        `,
        timeout: 10_000,
      })
      .then(result => RecordArrayType.parse(result.data));

    const operationsBySchemaCoordinate = new Map<
      string,
      Array<{
        name: string;
        count: number;
      }>
    >();

    for (const result of results) {
      let records = operationsBySchemaCoordinate.get(result.coordinate);
      if (!records) {
        records = [];
        operationsBySchemaCoordinate.set(result.coordinate, records);
      }
      records.push({
        name: result.name === '' ? 'unknown' : result.name,
        count: result.count,
      });
    }

    return args.schemaCoordinates.map(
      schemaCoordinate => operationsBySchemaCoordinate.get(schemaCoordinate) ?? null,
    );
  }

  getTopClientsForSchemaCoordinate = batchBy<
    {
      targetIds: readonly string[];
      excludedClients: null | readonly string[];
      period: DateRange;
      schemaCoordinate: string;
      graph?: GraphSelector | null;
    },
    Array<{ name: string; count: number }> | null
  >(
    item =>
      `${item.targetIds.join(',')}-${item.excludedClients?.join(',') ?? ''}-${item.period.from.toISOString()}-${item.period.to.toISOString()}-${graphKey(item.graph)}`,
    async items => {
      const schemaCoordinates = items.map(item => item.schemaCoordinate);
      return await this._getTopClientsForSchemaCoordinates({
        targetIds: items[0].targetIds,
        excludedClients: items[0].excludedClients,
        period: items[0].period,
        graph: items[0].graph,
        schemaCoordinates,
      }).then(result => result.map(result => Promise.resolve(result)));
    },
  );

  async countClientVersions({
    target,
    period,
    clientName,
    graph,
  }: {
    target: string;
    period: DateRange;
    clientName: string;
    graph?: GraphSelector | null;
  }): Promise<number> {
    const result = await this.clickHouse.query<{
      total: string;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
              SELECT
                count(distinct client_version) as total
              FROM ${aggregationTableName('clients')}
              ${this.createFilter({
                graph: ctx.graph,
                target,
                period,
                clients: clientName === 'unknown' ? [clientName, ''] : [clientName],
              })}
            `,
        queryId: aggregation => `count_client_versions_${aggregation}`,
        timeout: 10_000,
        period,
      }),
    );

    return result.data.length > 0 ? ensureNumber(result.data[0].total) : 0;
  }

  async getTopOperationsForTypes(args: {
    targetId: string;
    period: DateRange;
    limit: number;
    typeNames: readonly string[];
    graph?: GraphSelector | null;
  }): Promise<
    Map<
      string,
      Array<{
        operationName: string;
        operationHash: string;
        count: number;
      }>
    >
  > {
    const result = await this.clickHouse.query<{
      total: string;
      hash: string;
      name: string;
      coordinate: string;
    }>(
      this.pickAggregationByPeriod({
        graph: args.graph,
        queryId(aggregation) {
          return `get_top_operations_for_types_${aggregation}`;
        },
        query: (aggregationTableName, ctx) => sql`
          WITH coordinates as (
            SELECT cd.total, ${convertHash(sql.raw('cd.hash'), ctx.hashEncoding('coordinates'), 'hex')} AS hash, cd.coordinate
            FROM (
              SELECT
                sum(cdi.total) as total, cdi.hash as hash, cdi.coordinate as coordinate
              FROM ${aggregationTableName('coordinates')} as cdi
                ${this.createFilter({
                  graph: ctx.graph,
                  target: args.targetId,
                  period: args.period,
                  extra: [
                    sql`cdi.coordinate NOT LIKE '%.%.%'`,
                    sql`substringIndex(cdi.coordinate, '.', 1) IN (${sql.array(args.typeNames, 'String')})`,
                  ],
                  namespace: 'cdi',
                })}
              GROUP BY cdi.hash, cdi.coordinate ORDER by total DESC, cdi.hash ASC LIMIT ${sql.raw(
                String(args.limit),
              )} by cdi.coordinate
            ) as cd
          )
          SELECT total, hash, coordinate, ocd.name
          FROM coordinates as c LEFT JOIN (
              SELECT ocd.name, ocd.hash
              FROM operation_collection_details as ocd
              WHERE ocd.target = ${args.targetId} AND hash IN (SELECT hash FROM coordinates)
              LIMIT 1 BY ocd.hash
          ) as ocd ON ocd.hash = c.hash
        `,
        period: args.period,
        timeout: 15_000,
      }),
    );

    const coordinateToTopOperations = new Map<
      string,
      Array<{
        operationName: string;
        operationHash: string;
        count: number;
      }>
    >();
    for (const row of result.data) {
      const existing = coordinateToTopOperations.get(row.coordinate);
      const op = {
        operationName: row.name,
        operationHash: row.hash,
        count: ensureNumber(row.total),
      };

      if (existing) {
        existing.push(op);
      } else {
        coordinateToTopOperations.set(row.coordinate, [op]);
      }
    }

    return coordinateToTopOperations;
  }

  async getClientNamesPerCoorinateOfTypes(
    targetId: string,
    period: DateRange,
    coordinates: readonly string[],
    graph?: GraphSelector | null,
  ): Promise<Map<string, Set<string>>> {
    const dbResult = await this.clickHouse.query(
      this.pickAggregationByPeriod({
        graph,
        queryId: aggregation => `get_client_names_for_schema_coordinates_${aggregation}`,
        // KAMIL: I know this query is a bit weird, but it's the best I could come up with.
        // It processed 27x less rows than the previous version.
        // It's 30x faster.
        // It consumes 36x less memory (~8MB).
        // It obviously depends on the amount of original data, but I tested it on a multiple datasets
        // and the ratio is always similar.
        // I'm open to suggestions on how to improve it.
        //
        // What the query does is:
        // 1. Fetches all coordinates of a given type, with associated operation hashes.
        // 2. Fetches all client names (groups them by hash) of a given hash.
        // 3. Groups rows by coordinate.
        // 4. Merges client names and removes duplicates.
        //
        // Why it's faster then the previous version?
        // It's using sub queries instead of joins (yeah there is a join but with preselected list of rows).
        // It fetches much less data.
        // It fetches rows more accurately.
        query: (aggregationTableName, ctx) => sql`
          SELECT
            co.coordinate AS coordinate,
            groupUniqArrayArray(cl.client_names) AS client_names
          FROM
          (
            SELECT
              co.coordinate,
              co.hash
            FROM ${aggregationTableName('coordinates')} AS co
            ${this.createFilter({
              graph: ctx.graph,
              target: targetId,
              period: period,
              extra: [sql`co.coordinate IN (${sql.array(coordinates, 'String')})`],
              namespace: 'co',
            })}
            GROUP BY co.coordinate, co.hash
          ) AS co
          LEFT JOIN
          (
              SELECT
                arrayDistinct(groupArray(client_name)) AS client_names,
                cl.hash AS hash
              FROM ${aggregationTableName('clients')} AS cl
              ${this.createFilter({
                graph: ctx.graph,
                target: targetId,
                period: period,
                namespace: 'cl',
              })}
              GROUP BY cl.hash
          ) AS cl ON co.hash = cl.hash
          GROUP BY co.coordinate
          SETTINGS join_algorithm = 'parallel_hash'
        `,
        timeout: 15_000,
        period,
      }),
    );

    const list = CoordinateClientNamesGroupModel.parse(dbResult.data);
    return new Map<string, Set<string>>(
      list.map(item => [item.coordinate, new Set(item.client_names)]),
    );
  }

  async readUniqueClientNames({
    target,
    period,
    operations,
    graph,
  }: {
    target: string | readonly string[];
    period: DateRange;
    operations?: readonly string[];
    graph?: GraphSelector | null;
  }): Promise<
    Array<{
      name: string;
      count: number;
    }>
  > {
    const result = await this.clickHouse.query<{
      count: string;
      client_name: string;
    }>({
      query: sql`
        SELECT
          sum(total) as count,
          client_name
        FROM ${this.rollupTable('clients', 'daily', period)}
        ${this.createFilter({
          graph: this.graphFilterForPeriod(graph, period),
          target,
          period,
          operations,
          hashEncoding: this.hashEncoding('clients', period),
          extra: [sql`notEmpty(client_name)`],
        })}
        GROUP BY client_name
      `,
      queryId: 'count_client_names',
      timeout: 10_000,
    });

    return result.data.map(row => {
      return {
        name: row.client_name,
        count: ensureNumber(row.count),
      };
    });
  }

  async requestsOverTimeOfTargets(
    selectors: ReadonlyArray<{
      targets: readonly string[];
      period: DateRange;
      resolution: number;
      graph?: GraphSelector | null;
    }>,
  ) {
    const aggregationMap = new Map<
      string,
      {
        targets: string[];
        period: DateRange;
        resolution: number;
        graph?: GraphSelector | null;
      }
    >();

    const makeKey = (selector: {
      period: DateRange;
      resolution: number;
      graph?: GraphSelector | null;
    }) =>
      `${selector.period.from.toISOString()};${selector.period.to.toISOString()};${
        selector.resolution
      };${graphKey(selector.graph)}`;

    const subSelectors = selectors
      .map(selector =>
        selector.targets.map(target => ({
          target,
          period: selector.period,
          resolution: selector.resolution,
          graph: selector.graph,
        })),
      )
      .flat(1);

    // The idea here is to make the least possible number of queries to ClickHouse
    // by fetching all data points of the same target, period and resolution.
    for (const selector of subSelectors) {
      const key = makeKey(selector);
      const value = aggregationMap.get(key);

      if (!value) {
        aggregationMap.set(key, {
          targets: [selector.target],
          period: selector.period,
          resolution: selector.resolution,
          graph: selector.graph,
        });
      } else {
        value.targets.push(selector.target);
      }
    }

    const aggregationResultMap = new Map<
      string,
      Promise<
        readonly {
          date: number;
          total: number;
          target: string;
        }[]
      >
    >();

    for (const [key, { targets, period, resolution, graph }] of aggregationMap) {
      const interval = calculateTimeWindow({ period, resolution });
      const intervalRaw = this.clickHouse.translateWindow(interval);
      const roundedPeriod = {
        from: toStartOfInterval(period.from, interval.value, interval.unit),
        to: toEndOfInterval(period.to, interval.value, interval.unit),
      };
      const startDateTimeFormatted = formatDate(roundedPeriod.from);
      const endDateTimeFormatted = formatDate(roundedPeriod.to);

      aggregationResultMap.set(
        key,
        this.clickHouse
          .query<{
            date: string;
            target: string;
            total: number;
          }>(
            this.pickAggregationByPeriod({
              graph,
              query: (aggregationTableName, ctx) => sql`
                SELECT
                  toDateTime(
                      intDiv(
                        toUnixTimestamp(timestamp),
                        toUInt32(${String(interval.seconds)})
                      ) * toUInt32(${String(interval.seconds)})
                  ) as date,
                  sum(total) as total,
                  target
                FROM ${aggregationTableName('operations', 'graph')}
                ${this.createFilter({ target: targets, period: roundedPeriod, graph: ctx.graph })}
                GROUP BY target, date
                ORDER BY
                  target,
                  date
                    WITH FILL
                      FROM toDateTime(${startDateTimeFormatted}, 'UTC')
                      TO toDateTime(${endDateTimeFormatted}, 'UTC')
                      STEP INTERVAL ${intervalRaw}
              `,
              queryId: aggregation => `targets_count_over_time_${aggregation}`,
              timeout: 15_000,
              period,
              resolution,
            }),
          )
          .then(result =>
            result.data.map(row => ({
              date: toUnixTimestamp(row.date),
              total: row.total,
              target: row.target,
            })),
          ),
      );
    }

    // Because the function is used in a DataLoader,
    // it has to return a list of promises matching the order of selectors.
    return Promise.all(
      selectors.map(async selector => {
        const key = makeKey(selector);

        const queryPromise = aggregationResultMap.get(key);

        if (!queryPromise) {
          throw new Error(`Could not find data for ${key} selector`);
        }

        const rows = await queryPromise;

        const resultsPerTarget: {
          [target: string]: Array<{
            date: any;
            value: number;
          }>;
        } = {};

        for (const row of rows) {
          if (!selector.targets.includes(row.target)) {
            // it's not relevant to the current selector
            continue;
          }

          if (!resultsPerTarget[row.target]) {
            resultsPerTarget[row.target] = [];
          }

          resultsPerTarget[row.target].push({
            date: ensureNumber(row.date) as any,
            value: ensureNumber(row.total),
          });
        }

        return resultsPerTarget;
      }),
    );
  }

  async requestsOverTime({
    target,
    period,
    resolution,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
    schemaCoordinate,
  }: {
    target: string;
    period: DateRange;
    resolution: number;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
    schemaCoordinate?: string;
  }) {
    const results = await this.getDurationAndCountOverTime({
      target,
      period,
      resolution,
      operations,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
      graph,
      schemaCoordinate,
    });

    return results.map(row => ({
      date: row.date,
      value: row.total,
    }));
  }

  async failuresOverTime({
    target,
    period,
    resolution,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
  }: {
    target: string;
    period: DateRange;
    resolution: number;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
  }) {
    const result = await this.getDurationAndCountOverTime({
      target,
      period,
      resolution,
      operations,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
      graph,
    });

    return result.map(row => ({
      date: row.date,
      value: row.total - row.totalOk,
    }));
  }

  async durationOverTime({
    target,
    period,
    resolution,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
  }: {
    target: string;
    period: DateRange;
    resolution: number;
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
    operations?: readonly string[];
    clients?: readonly string[];
  }): Promise<
    Array<{
      date: any;
      duration: DurationMetrics;
    }>
  > {
    return this.getDurationAndCountOverTime({
      target,
      period,
      resolution,
      operations,
      clients,
      clientVersionFilters,
      excludeOperations,
      excludeClientVersionFilters,
      coordinateScopes,
      graph,
    });
  }

  async generalDurationPercentiles({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
  }: {
    target: string;
    period: DateRange;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
  }): Promise<DurationMetrics> {
    const result = await this.clickHouse.query<{
      percentiles: [number, number, number, number];
      average: number;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
          SELECT
            avgMerge(duration_avg) as average,
            ${this.durationQuantilesMerge(period)}(0.75, 0.90, 0.95, 0.99)(duration_quantiles) as percentiles
          FROM ${aggregationTableName(
            'operations',
            operationsRollupDimensions({
              operations,
              clients,
              clientVersionFilters,
              coordinateScopes,
            }),
          )}
            ${this.createFilter({ target, period, graph: ctx.graph, operations, hashEncoding: ctx.hashEncoding('operations'), clients, clientVersionFilters, excludeOperations, excludeClientVersionFilters, coordinateScope: { table: aggregationTableName('coordinates'), scopes: coordinateScopes ?? [] } })}
        `,
        queryId: aggregation => `general_duration_percentiles_${aggregation}`,
        timeout: 15_000,
        period,
      }),
    );

    return toDurationMetrics(result.data[0].percentiles, result.data[0].average);
  }

  async durationMetrics({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
    schemaCoordinate,
  }: {
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
    target: string;
    period: DateRange;
    operations?: readonly string[];
    clients?: readonly string[];
    schemaCoordinate?: string;
  }) {
    const result = await this.clickHouse.query<{
      hash: string;
      average: number;
      percentiles: [number, number, number, number];
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
            SELECT ${convertHash(sql.raw('hash'), ctx.hashEncoding('operations'), 'hex')} AS hash, average, percentiles
            FROM (
              SELECT
                hash,
                avgMerge(duration_avg) as average,
                ${this.durationQuantilesMerge(period)}(0.75, 0.90, 0.95, 0.99)(duration_quantiles) as percentiles
              FROM ${aggregationTableName('operations')}
              ${this.createFilter({
                graph: ctx.graph,
                target,
                period,
                operations,
                hashEncoding: ctx.hashEncoding('operations'),
                clients,
                clientVersionFilters,
                excludeOperations,
                excludeClientVersionFilters,
                coordinateScope: {
                  table: aggregationTableName('coordinates'),
                  scopes: withCoordinate(coordinateScopes, schemaCoordinate),
                },
              })}
              GROUP BY hash
            )
            `,
        queryId: aggregation => `duration_percentiles_${aggregation}`,
        timeout: 15_000,
        period,
      }),
    );

    const collection = new Map<string, DurationMetrics>();

    result.data.forEach(row => {
      collection.set(row.hash, toDurationMetrics(row.percentiles, row.average));
    });

    return collection;
  }

  async getClientNames({
    target,
    period,
    graph,
  }: {
    target: string;
    period: DateRange;
    graph?: GraphSelector | null;
  }): Promise<string[]> {
    const result = await this.clickHouse.query<{
      client_name: string;
    }>(
      this.pickAggregationByPeriod({
        graph,
        queryId: aggregation => `client_names_per_target_${aggregation}`,
        query: (aggregationTableName, ctx) => sql`
        SELECT client_name FROM ${aggregationTableName('clients')} ${this.createFilter({
          graph: ctx.graph,
          target,
          period,
        })} GROUP BY client_name
      `,
        timeout: 10_000,
        period,
      }),
    );

    return result.data.map(row => row.client_name);
  }

  /**
   * Use the coordinate_counts_daily table to check if any field usage data
   * has been ingested for the target. This can be used in conjunction with
   * the feature flag to appropriately display frontend components or opt
   * to hide them instead.
   */
  async coordinatesDataSyncedCheck({ targetId }: { targetId: string }): Promise<FieldMetricsState> {
    // assume expiration applies equally across the metric tables and so there's no need
    // to limit the timestamps

    const startedSendingFieldUsageAt = await this.clickHouse
      .query<{
        timestamp: string;
      }>({
        query: sql`
        SELECT MIN(timestamp) as timestamp
        FROM target_field_level_metrics_onboard_timestamp
        PREWHERE target = ${targetId}
      `,
        queryId: 'coordinate_data_synced_coords',
        // set a quick timeout to avoid inconvenience
        timeout: 3_000,
      })
      .then(r => {
        const maybeRow = r.data[0];
        return maybeRow ? toUnixTimestamp(maybeRow.timestamp) : null;
      });

    if (!startedSendingFieldUsageAt) {
      return FieldMetricsState.NO_DATA;
    }

    const operationsStart = await this.clickHouse
      .query<{
        startTime: string;
      }>({
        query: sql`
        SELECT MIN(timestamp) as startTime
        FROM operations_by_target_hourly
        PREWHERE
          target = ${targetId}
          AND timestamp < fromUnixTimestamp64Milli(${sql.raw(String(startedSendingFieldUsageAt))})
        LIMIT 1;
      `,
        queryId: 'coordinate_data_synced_operations',
        // set a quick timeout to avoid inconvenience
        timeout: 3_000,
      })
      .then(r => {
        const maybeRow = r.data[0];
        return maybeRow ? toUnixTimestamp(maybeRow.startTime) : null;
      });

    // check if any operations sent before the adjusted coordinate timestamp
    if (operationsStart === null) {
      // if no operation is found before this timestamp, then those operation records
      // must have been deleted via TTL. In this case, the field level metrics
      // and operation metrics are both limited by the TTL and are in sync.
      return FieldMetricsState.IN_SYNC;
    }
    // Else we know coordinate data and operation usage data mismatch.
    return FieldMetricsState.HISTORY_MISSING;
  }

  async getCoordinatesOverTime({
    targetId,
    period,
    resolution,
    schemaCoordinate,
    graph,
  }: {
    targetId: string;
    period: DateRange;
    resolution: number;
    schemaCoordinate: string;
    graph?: GraphSelector | null;
  }) {
    const interval = calculateTimeWindow({ period, resolution });
    const intervalRaw = this.clickHouse.translateWindow(interval);
    const roundedPeriod = {
      from: toStartOfInterval(period.from, interval.value, interval.unit),
      to: toEndOfInterval(period.to, interval.value, interval.unit),
    };
    const startDateTimeFormatted = formatDate(roundedPeriod.from);
    const endDateTimeFormatted = formatDate(roundedPeriod.to);

    const query = this.pickAggregationByPeriod({
      graph,
      timeout: 15_000,
      period,
      resolution,
      queryId: aggregation => `coord_count_over_time_${aggregation}`,
      query: (aggregationTableName, ctx) => {
        return sql`
        SELECT
          date,
          total,
        FROM (
          SELECT
            toDateTime(
              intDiv(
                toUnixTimestamp(timestamp),
                toUInt32(${String(interval.seconds)})
              ) * toUInt32(${String(interval.seconds)})
            ) as date,
            sum(total) as total
          FROM ${aggregationTableName('coordinate_counts')}
          ${this.createFilter({
            graph: ctx.graph,
            target: targetId,
            period: roundedPeriod,
            extra: [sql`coordinate = ${schemaCoordinate}`],
          })}
          GROUP BY date
          ORDER BY date
          WITH FILL
            FROM toDateTime(${startDateTimeFormatted}, 'UTC')
            TO toDateTime(${endDateTimeFormatted}, 'UTC')
            STEP INTERVAL ${intervalRaw}
        )
      `;
      },
    });

    // multiply by 1000 to convert to milliseconds
    const result = await this.clickHouse.query<{
      date: string;
      total: number;
    }>(query);

    return result.data.map(row => {
      return {
        date: toUnixTimestamp(row.date),
        value: ensureNumber(row.total),
      };
    });
  }

  async getCoordinateFailuresOverTime({
    targetId,
    period,
    resolution,
    schemaCoordinate,
    graph,
  }: {
    targetId: string;
    period: DateRange;
    resolution: number;
    schemaCoordinate: string;
    graph?: GraphSelector | null;
  }) {
    const interval = calculateTimeWindow({ period, resolution });
    const intervalRaw = this.clickHouse.translateWindow(interval);
    const roundedPeriod = {
      from: toStartOfInterval(period.from, interval.value, interval.unit),
      to: toEndOfInterval(period.to, interval.value, interval.unit),
    };
    const startDateTimeFormatted = formatDate(roundedPeriod.from);
    const endDateTimeFormatted = formatDate(roundedPeriod.to);

    const query = this.pickAggregationByPeriod({
      graph,
      timeout: 15_000,
      period,
      resolution,
      queryId: aggregation => `coord_failures_over_time_${aggregation}`,
      query: (aggregationTableName, ctx) => {
        return sql`
        SELECT
          date,
          total,
        FROM (
          SELECT
            toDateTime(
              intDiv(
                toUnixTimestamp(timestamp),
                toUInt32(${String(interval.seconds)})
              ) * toUInt32(${String(interval.seconds)})
            ) as date,
            sum(total_errors) as total
          FROM ${aggregationTableName('coordinate_errors')}
          ${this.createFilter({
            graph: ctx.graph,
            target: targetId,
            period: roundedPeriod,
            extra: [sql`coordinate = ${schemaCoordinate}`],
          })}
          GROUP BY date
          ORDER BY date
          WITH FILL
            FROM toDateTime(${startDateTimeFormatted}, 'UTC')
            TO toDateTime(${endDateTimeFormatted}, 'UTC')
            STEP INTERVAL ${intervalRaw}
        )
      `;
      },
    });

    // multiply by 1000 to convert to milliseconds
    const result = await this.clickHouse.query<{
      date: string;
      total: number;
    }>(query);

    return result.data.map(row => {
      return {
        date: toUnixTimestamp(row.date),
        value: ensureNumber(row.total),
      };
    });
  }

  private async getDurationAndCountOverTime({
    target,
    period,
    resolution,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScopes,
    graph,
    schemaCoordinate,
  }: {
    target: string;
    period: DateRange;
    resolution: number;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    coordinateScopes?: ReadonlyArray<readonly string[]>;
    graph?: GraphSelector | null;
    schemaCoordinate?: string;
  }) {
    const interval = calculateTimeWindow({ period, resolution });
    const intervalRaw = this.clickHouse.translateWindow(interval);
    const roundedPeriod = {
      from: toStartOfInterval(period.from, interval.value, interval.unit),
      to: toEndOfInterval(period.to, interval.value, interval.unit),
    };
    const startDateTimeFormatted = formatDate(roundedPeriod.from);
    const endDateTimeFormatted = formatDate(roundedPeriod.to);

    const query = this.pickAggregationByPeriod({
      graph,
      timeout: 15_000,
      period,
      resolution,
      queryId: aggregation => `duration_and_count_over_time_${aggregation}`,
      query: (aggregationTableName, ctx) => {
        return sql`
        SELECT
          date,
          average,
          percentiles,
          total,
          totalOk
        FROM (
          SELECT
            toDateTime(
              intDiv(
                toUnixTimestamp(timestamp),
                toUInt32(${String(interval.seconds)})
              ) * toUInt32(${String(interval.seconds)})
            ) as date,
            avgMerge(duration_avg) as average,
            ${this.durationQuantilesMerge(period)}(0.75, 0.90, 0.95, 0.99)(duration_quantiles) as percentiles,
            sum(total) as total,
            sum(total_ok) as totalOk
          FROM ${aggregationTableName(
            'operations',
            operationsRollupDimensions({
              operations,
              clients,
              clientVersionFilters,
              coordinateScopes,
              schemaCoordinate,
            }),
          )}
          ${this.createFilter({
            graph: ctx.graph,
            target,
            period: roundedPeriod,
            operations,
            hashEncoding: ctx.hashEncoding('operations'),
            clients,
            clientVersionFilters,
            excludeOperations,
            excludeClientVersionFilters,
            coordinateScope: {
              table: aggregationTableName('coordinates'),
              scopes: withCoordinate(coordinateScopes, schemaCoordinate),
            },
          })}
          GROUP BY date
          ORDER BY date
          WITH FILL
            FROM toDateTime(${startDateTimeFormatted}, 'UTC')
            TO toDateTime(${endDateTimeFormatted}, 'UTC')
            STEP INTERVAL ${intervalRaw}
        )
      `;
      },
    });

    // multiply by 1000 to convert to milliseconds
    const result = await this.clickHouse.query<{
      date: string;
      total: number;
      totalOk: number;
      average: number;
      percentiles: [number, number, number, number];
    }>(query);

    return result.data.map(row => {
      return {
        date: toUnixTimestamp(row.date),
        total: ensureNumber(row.total),
        totalOk: ensureNumber(row.totalOk),
        duration: toDurationMetrics(row.percentiles, row.average),
      };
    });
  }

  // Every call to this method is part of the batching logic.
  // The `batch` function works similar to the DataLoader concept.
  // It gathers all function calls within the same event loop,
  // and calls the inner function in the next cycle.
  countCoordinatesOfType = batch(
    async (
      selectors: Array<{
        target: string;
        period: DateRange;
        typename: string;
        graph?: GraphSelector | null;
      }>,
    ) => {
      const aggregationMap = new Map<
        string,
        {
          target: string;
          period: DateRange;
          typenames: string[];
          graph?: GraphSelector | null;
        }
      >();

      const makeKey = (selector: {
        target: string;
        period: DateRange;
        graph?: GraphSelector | null;
      }) =>
        `${
          selector.target
        }-${selector.period.from.toISOString()}-${selector.period.to.toISOString()}-${graphKey(selector.graph)}`;

      // Groups the type names by their target and period
      // The idea here is to make the least possible number of queries to ClickHouse
      // by fetching all selected type names of the same target and period.
      for (const selector of selectors) {
        const key = makeKey(selector);
        const value = aggregationMap.get(key);

        if (!value) {
          aggregationMap.set(key, {
            target: selector.target,
            period: selector.period,
            typenames: [selector.typename],
            graph: selector.graph,
          });
        } else {
          value.typenames.push(selector.typename);
        }
      }

      const resultMap = new Map<
        string,
        Promise<
          {
            coordinate: string;
            total: number;
            totalResolutions: number | null;
          }[]
        >
      >();

      // Do the actual call to ClickHouse to get the coordinates and counts of selected type names.
      for (const selector of aggregationMap.values()) {
        const key = makeKey(selector);

        resultMap.set(
          key,
          this.countCoordinatesOfTypes({
            target: selector.target,
            period: selector.period,
            typenames: selector.typenames,
            graph: selector.graph,
          }),
        );
      }

      // Because the `batch` function is used (it's a similar concept to DataLoader),
      // it has tu return a map of promises matching provided selectors in exact same order.
      return selectors.map(selector => {
        const key = makeKey(selector);
        const value = resultMap.get(key);

        if (!value) {
          throw new Error(`Could not find data for ${key} selector`);
        }

        return value;
      });
    },
  );

  private async countCoordinatesOfTypes({
    target,
    period,
    typenames,
    graph,
  }: {
    target: string;
    period: DateRange;
    typenames: string[];
    graph?: GraphSelector | null;
  }) {
    const typesConditions = typenames.map(
      t => sql`coordinate = ${t} OR coordinate LIKE ${t + '.%'}`,
    );

    const query = this.pickAggregationByPeriod({
      graph,
      query: (aggregationTableName, ctx) => sql`
      SELECT
        coalesce(c.coordinate, r.coordinate) AS coordinate,
        c.total AS total,
        r.totalResolutions AS totalResolutions
      FROM
      (
        SELECT coordinate, sum(total) as total
        FROM ${aggregationTableName('coordinates')}
        ${this.createFilter({
          graph: ctx.graph,
          target,
          period,
          extra: [sql`(${sql.join(typesConditions, ' OR ')})`],
        })}
        GROUP BY coordinate
      ) AS c
      LEFT OUTER JOIN
      (
        SELECT coordinate, sum(total) as totalResolutions
        FROM ${aggregationTableName('coordinate_counts')}
        ${this.createFilter({
          graph: ctx.graph,
          target,
          period,
          extra: [sql`(${sql.join(typesConditions, ' OR ')})`],
        })}
        GROUP BY coordinate
      ) AS r
      ON c.coordinate = r.coordinate
      ;`,
      queryId: aggregation => `coordinates_per_types_${aggregation}`,
      timeout: 15_000,
      period,
    });

    const result = await this.clickHouse.query<{
      coordinate: string;
      total: number;
      totalResolutions?: number | null;
    }>(query);

    return result.data.map(row => ({
      coordinate: row.coordinate,
      total: ensureNumber(row.total),
      totalResolutions: row.totalResolutions ? ensureNumber(row.totalResolutions) : null,
    }));
  }

  // Identical to count coordinates, but for field errors
  /**
   * Counts the number of errors for a specific coordinate. This is the total resolved count.
   * Note that in a single request, one coordinate can have multiple errors.
   */
  countErrorCoordinatesOfType = batch(
    async (
      selectors: Array<{
        target: string;
        period: DateRange;
        typename: string;
        graph?: GraphSelector | null;
      }>,
    ) => {
      const aggregationMap = new Map<
        string,
        {
          target: string;
          period: DateRange;
          typenames: string[];
          graph?: GraphSelector | null;
        }
      >();

      const makeKey = (selector: {
        target: string;
        period: DateRange;
        graph?: GraphSelector | null;
      }) =>
        `${
          selector.target
        }-${selector.period.from.toISOString()}-${selector.period.to.toISOString()}-${graphKey(selector.graph)}`;

      // Groups the type names by their target and period
      // The idea here is to make the least possible number of queries to ClickHouse
      // by fetching all selected type names of the same target and period.
      for (const selector of selectors) {
        const key = makeKey(selector);
        const value = aggregationMap.get(key);

        if (!value) {
          aggregationMap.set(key, {
            target: selector.target,
            period: selector.period,
            typenames: [selector.typename],
            graph: selector.graph,
          });
        } else {
          value.typenames.push(selector.typename);
        }
      }

      const resultMap = new Map<
        string,
        Promise<
          {
            coordinate: string;
            total: number;
          }[]
        >
      >();

      // Do the actual call to ClickHouse to get the coordinates and counts of selected type names.
      for (const selector of aggregationMap.values()) {
        const key = makeKey(selector);

        resultMap.set(
          key,
          this.countErrorCoordinatesOfTypes({
            target: selector.target,
            period: selector.period,
            typenames: selector.typenames,
            graph: selector.graph,
          }),
        );
      }

      // Because the `batch` function is used (it's a similar concept to DataLoader),
      // it has tu return a map of promises matching provided selectors in exact same order.
      return selectors.map(selector => {
        const key = makeKey(selector);
        const value = resultMap.get(key);

        if (!value) {
          throw new Error(`Could not find data for ${key} selector`);
        }

        return value;
      });
    },
  );

  private async countErrorCoordinatesOfTypes({
    target,
    period,
    typenames,
    graph,
  }: {
    target: string;
    period: DateRange;
    typenames: string[];
    graph?: GraphSelector | null;
  }) {
    const typesConditions = typenames.map(
      t => sql`coordinate = ${t} OR coordinate LIKE ${t + '.%'}`,
    );
    const result = await this.clickHouse.query<{
      coordinate: string;
      total: number;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
        SELECT coordinate, sum(total_errors) as total FROM ${aggregationTableName('coordinate_errors')}
        ${this.createFilter({
          graph: ctx.graph,
          target,
          period,
          extra: [sql`(${sql.join(typesConditions, ' OR ')})`],
        })}
        GROUP BY coordinate`,
        queryId: aggregation => `coordinates_per_types_${aggregation}`,
        timeout: 15_000,
        period,
      }),
    );

    return result.data.map(row => ({
      coordinate: row.coordinate,
      total: ensureNumber(row.total),
    }));
  }

  @traceFn('OperationReader.countCoordinatesOfTarget', {
    initAttributes: input => ({
      'hive.target.id': input.target,
    }),
  })
  async countCoordinatesOfTarget({
    target,
    period,
    graph,
  }: {
    target: string;
    period: DateRange;
    graph?: GraphSelector | null;
  }) {
    this.logger.debug('Count coordinates of target. (targetId=%s, period=%o)', target, period);

    const result = await this.clickHouse.query<{
      coordinate: string;
      total: number;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
        SELECT coordinate, sum(total) as total FROM ${aggregationTableName('coordinates')}
        ${this.createFilter({
          graph: ctx.graph,
          target,
          period,
        })}
        GROUP BY coordinate
      `,
        queryId: aggregation => `coordinates_per_target_${aggregation}`,
        timeout: 15_000,
        period,
      }),
    );

    this.logger.debug('%d rows found. (targetId=%s, period=%o)', result.rows, target, period);

    return result.data.map(row => ({
      coordinate: row.coordinate,
      total: ensureNumber(row.total),
    }));
  }

  async adminCountOperationsPerTarget({
    period,
  }: {
    period: {
      from: Date;
      to: Date;
    };
  }) {
    const result = await this.clickHouse.query<{
      total: string;
      target: string;
    }>(
      this.pickAggregationByPeriod({
        query: aggregationTableName => sql`
        SELECT
          sum(total) as total,
          target
        FROM ${aggregationTableName('operations', 'graph')}
        PREWHERE
          timestamp >= toDateTime(${formatDate(period.from)}, 'UTC')
          AND
          timestamp <= toDateTime(${formatDate(period.to)}, 'UTC')
        GROUP BY target`,
        queryId: aggregation => `admin_operations_per_target_${aggregation}`,
        timeout: 15_000,
        period,
      }),
    );

    return result.data.map(row => ({
      total: ensureNumber(row.total),
      target: row.target,
    }));
  }

  async adminOperationsOverTime({
    period,
    resolution,
  }: {
    period: {
      from: Date;
      to: Date;
    };
    resolution: number;
  }) {
    const interval = calculateTimeWindow({ period, resolution });
    const intervalRaw = this.clickHouse.translateWindow(interval);
    const roundedPeriod = {
      from: toStartOfInterval(period.from, interval.value, interval.unit),
      to: toEndOfInterval(period.to, interval.value, interval.unit),
    };
    const startDateTimeFormatted = formatDate(roundedPeriod.from);
    const endDateTimeFormatted = formatDate(roundedPeriod.to);

    const result = await this.clickHouse.query<{
      date: string;
      total: string;
    }>(
      this.pickAggregationByPeriod({
        query: aggregationTableName => sql`
        SELECT
          toDateTime(
            intDiv(
              toUnixTimestamp(timestamp),
              toUInt32(${String(interval.seconds)})
            ) * toUInt32(${String(interval.seconds)})
          ) as date,
          sum(total) as total
        FROM ${aggregationTableName('operations', 'graph')}
        ${this.createFilter({ period: roundedPeriod })}
        GROUP BY date
        ORDER BY date
          WITH FILL
            FROM toDateTime(${startDateTimeFormatted}, 'UTC')
            TO toDateTime(${endDateTimeFormatted}, 'UTC')
            STEP INTERVAL ${intervalRaw}
      `,
        queryId: aggregation => `admin_operations_per_target_${aggregation}`,
        timeout: 15_000,
        period,
        resolution,
      }),
    );

    return result.data.map(row => ({
      date: toUnixTimestamp(row.date),
      total: ensureNumber(row.total),
    }));
  }

  async errorCodesAtSchemaCoordinate({
    period,
    target,
    schemaCoordinate,
    graph,
  }: {
    period: {
      from: Date;
      to: Date;
    };
    target: string;
    schemaCoordinate: string;
    graph?: GraphSelector | null;
  }) {
    const result = await this.clickHouse.query<{
      count: number;
      code: string;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
        SELECT
          sum(total_errors) as count,
          code
        FROM ${aggregationTableName('coordinate_errors')}
        PREWHERE
          timestamp >= toDateTime(${formatDate(period.from)}, 'UTC')
          AND
          timestamp <= toDateTime(${formatDate(period.to)}, 'UTC')
          AND
          target = ${target}
          AND
          coordinate = ${schemaCoordinate}
          ${andGraphConditions(ctx.graph)}
        GROUP BY code`,
        queryId: aggregation => `error_codes_at_schema_coordinate_${aggregation}`,
        timeout: 15_000,
        period,
      }),
    );
    return result.data.map(d => ({
      count: ensureNumber(d.count),
      code: d.code,
    }));
  }

  async errorCodesOverTimeAtSchemaCoordinate({
    schemaCoordinate,
    target,
    period,
    resolution,
    graph,
  }: {
    schemaCoordinate: string;
    target: string;
    graph?: GraphSelector | null;
    period: {
      from: Date;
      to: Date;
    };
    resolution: number;
  }) {
    const interval = calculateTimeWindow({ period, resolution });
    const intervalRaw = this.clickHouse.translateWindow(interval);
    const roundedPeriod = {
      from: toStartOfInterval(period.from, interval.value, interval.unit),
      to: toEndOfInterval(period.to, interval.value, interval.unit),
    };
    const startDateTimeFormatted = formatDate(roundedPeriod.from);
    const endDateTimeFormatted = formatDate(roundedPeriod.to);

    const result = await this.clickHouse.query<{
      date: string;
      code: string;
      count: string;
    }>(
      this.pickAggregationByPeriod({
        graph,
        query: (aggregationTableName, ctx) => sql`
        SELECT
          toDateTime(
            intDiv(
              toUnixTimestamp(timestamp),
              toUInt32(${String(interval.seconds)})
            ) * toUInt32(${String(interval.seconds)})
          ) as date,
          code,
          sum(total_errors) as count
        FROM ${aggregationTableName('coordinate_errors')}
        ${this.createFilter({
          graph: ctx.graph,
          period: roundedPeriod,
          target,
          extra: [sql`coordinate=${schemaCoordinate}`],
        })}
        GROUP BY code, date
        ORDER BY code, date
          WITH FILL
            FROM toDateTime(${startDateTimeFormatted}, 'UTC')
            TO toDateTime(${endDateTimeFormatted}, 'UTC')
            STEP INTERVAL ${intervalRaw}
      `,
        queryId: aggregation => `error_codes_over_time_at_${aggregation}`,
        timeout: 15_000,
        period,
        resolution,
      }),
    );

    return result.data.map(row => ({
      code: row.code,
      date: toUnixTimestamp(row.date),
      count: ensureNumber(row.count),
    }));
  }

  public createFilter({
    target,
    period,
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    coordinateScope,
    graph,
    extra = [],
    skipWhere = false,
    namespace,
    hashEncoding,
  }: {
    target?: string | readonly string[];
    period?: DateRange;
    graph?: GraphFilter | null;
    operations?: readonly string[];
    clients?: readonly string[];
    clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
    excludeOperations?: boolean;
    excludeClientVersionFilters?: boolean;
    /**
     * Restricts to operations whose document uses any coordinate of each scope (scopes are ANDed).
     * `table` is the `coordinates_*` tier matching the outer query.
     */
    coordinateScope?: { table: RawValue; scopes: ReadonlyArray<readonly string[]> };
    extra?: SqlValue[];
    skipWhere?: boolean;
    namespace?: string;
    /**
     * How the filtered table stores `hash` (see `hashEncodingOf`). Required with `operations`,
     * since the hex input has to be compared differently against binary hashes.
     */
    hashEncoding?: HashEncoding;
  }): SqlValue {
    if (operations?.length && !hashEncoding) {
      throw new Error('createFilter: `hashEncoding` is required when filtering by `operations`.');
    }

    const where: SqlValue[] = this.scopeConditions({ target, period, graph, namespace });

    // Operation-hash + client(/version) conditions are built by the shared
    // `@hive/clickhouse` helper so the API and the metric-alert worker filter
    // identically. `target`/`period`/`extra`/PREWHERE remain createFilter's concern.
    where.push(
      ...buildOperationsFilterSQLConditions({
        operations,
        clients,
        clientVersionFilters,
        excludeOperations,
        excludeClientVersionFilters,
        namespace,
        hashEncoding,
      }),
    );

    if (coordinateScope) {
      for (const coordinates of coordinateScope.scopes) {
        where.push(
          buildCoordinateScopeCondition({
            coordinatesTable: coordinateScope.table,
            scopeConditions: this.scopeConditions({ target, period, graph }),
            coordinates,
            namespace,
          }),
        );
      }
    }

    if (extra.length) {
      where.push(...extra);
    }

    const statement = where.length
      ? sql` ${sql.raw(skipWhere ? '' : 'PREWHERE')} ${sql.join(where, ' AND ')} `
      : sql``;

    return statement;
  }

  private scopeConditions({
    target,
    period,
    graph,
    namespace,
  }: {
    target?: string | readonly string[];
    period?: DateRange;
    graph?: GraphFilter | null;
    namespace?: string;
  }): SqlValue[] {
    const where: SqlValue[] = [];
    const columnPrefix = sql.raw(namespace ? `${namespace}.` : '');

    if (target) {
      if (Array.isArray(target)) {
        where.push(sql`${columnPrefix}target IN (${sql.array(target, 'String')})`);
      } else {
        where.push(sql`${columnPrefix}target = ${target as string}`);
      }
    }

    if (graph) {
      where.push(...buildGraphConditions(graph, namespace));
    }

    if (period) {
      where.push(
        sql`${columnPrefix}timestamp >= toDateTime(${formatDate(period.from)}, 'UTC')`,
        sql`${columnPrefix}timestamp <= toDateTime(${formatDate(period.to)}, 'UTC')`,
      );
    }

    return where;
  }

  private makeId({
    type,
    field,
    argument,
  }: {
    type: string;
    field?: string | null;
    argument?: string | null;
  }): string {
    return [type, field, argument].filter(Boolean).join('.');
  }
}

/** Drops empty rows; most requests first. */
function groupByKey<T extends { key: string; count: number }>(rows: T[]) {
  const groups = new Map<string, Array<Omit<T, 'key'>>>();
  for (const { key, ...row } of rows) {
    if (row.count <= 0) {
      continue;
    }
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  for (const group of groups.values()) {
    group.sort((a, b) => b.count - a.count);
  }
  return groups;
}
