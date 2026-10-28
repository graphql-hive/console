import { printWithValues, type SqlValue } from '@hive/clickhouse';
import type { ClickHouseClient } from './clickhouse-client.js';
import {
  DAILY_THRESHOLD_MINUTES,
  EMPTY_RESOLVED_FILTER,
  evaluationIntervalMinutes,
  extractMetricValue,
  groupRulesByQuery,
  isFilteredFilter,
  isRuleDue,
  parseSavedFilter,
  previousValueForRule,
  queryClickHouseWindows,
  resolutionFor,
  resolveSavedFilter,
  type ParsedSavedFilter,
} from './metric-alert-evaluator.js';
import { makeLogger, makeRule } from './metric-alert-test-utils.js';
import type { SupergraphOwnershipLoader } from './supergraph-ownership.js';

const render = (conds: SqlValue[]) => conds.map(c => printWithValues(c));

describe('groupRulesByQuery', () => {
  test('groups by target + window + savedFilterId', () => {
    const groups = groupRulesByQuery([
      makeRule({ id: 'a', savedFilterId: 'f1' }),
      makeRule({ id: 'b', savedFilterId: 'f1' }), // same filter -> same group as a
      makeRule({ id: 'c', savedFilterId: 'f2' }), // different filter -> own group
      makeRule({ id: 'd', savedFilterId: null }), // no filter -> own group
    ]);
    expect(groups.size).toBe(3);
    expect([...groups.values()].map(g => g.length).sort((x, y) => x - y)).toEqual([1, 1, 2]);
  });

  test('different time windows split groups even with the same filter', () => {
    const groups = groupRulesByQuery([
      makeRule({ id: 'a', savedFilterId: 'f1', timeWindowMinutes: 60 }),
      makeRule({ id: 'b', savedFilterId: 'f1', timeWindowMinutes: 720 }),
    ]);
    expect(groups.size).toBe(2);
  });

  test('at >= 7d a TRAFFIC rule and a latency rule split into hourly + daily groups', () => {
    const groups = groupRulesByQuery([
      makeRule({ id: 'a', type: 'TRAFFIC', timeWindowMinutes: 10080 }),
      makeRule({ id: 'b', type: 'LATENCY', metric: 'P95', timeWindowMinutes: 10080 }),
    ]);
    expect(groups.size).toBe(2);
    const tiers = [...groups.values()]
      .map(g => resolutionFor(g[0].timeWindowMinutes, g[0].type !== 'TRAFFIC'))
      .sort();
    expect(tiers).toEqual(['daily', 'hourly']);
  });

  test('below 7d a TRAFFIC rule and a latency rule share a group (same tier)', () => {
    const groups = groupRulesByQuery([
      makeRule({ id: 'a', type: 'TRAFFIC', timeWindowMinutes: 720 }),
      makeRule({ id: 'b', type: 'LATENCY', metric: 'P95', timeWindowMinutes: 720 }),
    ]);
    expect(groups.size).toBe(1);
  });
});

describe('evaluationIntervalMinutes', () => {
  test('tiers by window size', () => {
    expect(evaluationIntervalMinutes(60)).toBe(1);
    expect(evaluationIntervalMinutes(61)).toBe(5);
    expect(evaluationIntervalMinutes(360)).toBe(5);
    expect(evaluationIntervalMinutes(361)).toBe(15);
    expect(evaluationIntervalMinutes(1440)).toBe(15);
    expect(evaluationIntervalMinutes(1441)).toBe(30);
    expect(evaluationIntervalMinutes(10080)).toBe(30);
  });
});

describe('DAILY_THRESHOLD_MINUTES', () => {
  // Must match METRIC_ALERT_RULE_DAILY_ROLLUP_THRESHOLD_MINUTES in the api
  // package (separate package, can't import); pin the value on both sides.
  test('is exactly 7 whole days', () => {
    expect(DAILY_THRESHOLD_MINUTES).toBe(10080);
  });
});

describe('resolutionFor', () => {
  test('tiers by window, with TRAFFIC pinned off the daily rollup', () => {
    expect(resolutionFor(60, true)).toBe('minutely');
    expect(resolutionFor(360, true)).toBe('minutely');
    expect(resolutionFor(720, true)).toBe('hourly');
    expect(resolutionFor(DAILY_THRESHOLD_MINUTES - 1, true)).toBe('hourly');
    expect(resolutionFor(DAILY_THRESHOLD_MINUTES, true)).toBe('daily');
    // allowDailyRollup=false (a TRAFFIC group) never reaches daily.
    expect(resolutionFor(DAILY_THRESHOLD_MINUTES, false)).toBe('hourly');
  });
});

describe('isRuleDue', () => {
  const evalTime = new Date('2026-07-08T12:00:00.000Z');
  // ISO timestamp for a point `minutes` before evalTime (mirrors the `to_json`
  // timestamp string fetchEnabledRules returns for last_evaluated_at).
  const ago = (minutes: number) => new Date(evalTime.getTime() - minutes * 60_000).toISOString();

  test('a never-evaluated rule is always due', () => {
    expect(isRuleDue(makeRule({ lastEvaluatedAt: null, timeWindowMinutes: 10080 }), evalTime)).toBe(
      true,
    );
  });

  test('7-day rule: due once its 30-min interval has elapsed', () => {
    const base = { timeWindowMinutes: 10080, state: 'NORMAL' as const };
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(0) }), evalTime)).toBe(false);
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(29) }), evalTime)).toBe(false);
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(30) }), evalTime)).toBe(true);
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(31) }), evalTime)).toBe(true);
  });

  test('sub-second tolerance only: 5s short of the interval is still not due', () => {
    const almost = new Date(evalTime.getTime() - (30 * 60_000 - 5_000)).toISOString();
    expect(
      isRuleDue(
        makeRule({ timeWindowMinutes: 10080, state: 'NORMAL', lastEvaluatedAt: almost }),
        evalTime,
      ),
    ).toBe(false);
  });

  test('a 1h-window rule stays on the every-minute cadence', () => {
    const base = { timeWindowMinutes: 60, state: 'NORMAL' as const };
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(0) }), evalTime)).toBe(false);
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(1) }), evalTime)).toBe(true);
  });

  test('PENDING/RECOVERING keep full 1-min resolution regardless of window', () => {
    for (const state of ['PENDING', 'RECOVERING'] as const) {
      expect(
        isRuleDue(makeRule({ timeWindowMinutes: 10080, state, lastEvaluatedAt: ago(1) }), evalTime),
      ).toBe(true);
    }
    // The same 7-day rule in a steady state, 1 min after eval, is NOT due.
    for (const state of ['NORMAL', 'FIRING'] as const) {
      expect(
        isRuleDue(makeRule({ timeWindowMinutes: 10080, state, lastEvaluatedAt: ago(1) }), evalTime),
      ).toBe(false);
    }
  });
});

describe('parseSavedFilter', () => {
  test('null filters -> an empty filter', () => {
    const { logger } = makeLogger();
    const parsed = parseSavedFilter(null, logger);
    expect(parsed).toEqual({ conditions: [], schemaCoordinates: [], subgraphNames: [] });
    expect(isFilteredFilter(parsed)).toBe(false);
  });

  test('builds hash + client-version conditions from a saved filter', () => {
    const { logger } = makeLogger();
    const conds = parseSavedFilter(
      {
        operationHashes: ['h1', 'h2'],
        clientFilters: [
          { name: 'web', versions: ['1.0'] },
          { name: 'mobile', versions: null },
        ],
        excludeOperations: false,
        excludeClientFilters: false,
      },
      logger,
    ).conditions;
    expect(render(conds)).toEqual([
      `(hash) IN (['h1', 'h2'])`,
      `((client_name = 'web' AND client_version IN (['1.0'])) OR (client_name = 'mobile'))`,
    ]);
  });

  test('ignores dateRange — the alert uses its own rolling window', () => {
    const { logger } = makeLogger();
    const conds = parseSavedFilter(
      { operationHashes: ['h1'], dateRange: { from: '2024-01-01', to: '2024-02-01' } },
      logger,
    ).conditions;
    const rendered = render(conds);
    expect(rendered).toEqual([`(hash) IN (['h1'])`]);
    expect(rendered.join(' ')).not.toContain('timestamp');
  });

  test(`'unknown' client maps to empty string`, () => {
    const { logger } = makeLogger();
    expect(
      render(
        parseSavedFilter({ clientFilters: [{ name: 'unknown', versions: null }] }, logger)
          .conditions,
      ),
    ).toEqual([`((client_name = ''))`]);
  });

  test('malformed filters -> no conditions + warns, and never throws (isolated)', () => {
    const { logger, warnings } = makeLogger();
    // clientFilters must be an array of objects; a string is malformed.
    const parsed = parseSavedFilter({ clientFilters: 'oops' }, logger);
    expect(parsed).toEqual({ conditions: [], schemaCoordinates: [], subgraphNames: [] });
    expect(warnings.length).toBe(1);
  });

  test('keeps schema coordinates and subgraph names for resolution', () => {
    const { logger } = makeLogger();
    const parsed = parseSavedFilter(
      { schemaCoordinates: ['Query.me'], subgraphNames: ['reviews'] },
      logger,
    );
    expect(parsed.conditions).toEqual([]);
    expect(parsed.schemaCoordinates).toEqual(['Query.me']);
    expect(parsed.subgraphNames).toEqual(['reviews']);
    // Narrows the query even though no hash/client condition exists.
    expect(isFilteredFilter(parsed)).toBe(true);
  });

  test('a legacy blob without the new keys reads as empty lists', () => {
    const { logger } = makeLogger();
    const parsed = parseSavedFilter({ operationHashes: ['h1'] }, logger);
    expect(parsed.schemaCoordinates).toEqual([]);
    expect(parsed.subgraphNames).toEqual([]);
  });
});

describe('resolveSavedFilter', () => {
  const parsed = (over: Partial<ParsedSavedFilter> = {}): ParsedSavedFilter => ({
    conditions: [],
    schemaCoordinates: [],
    subgraphNames: [],
    ...over,
  });
  function fakeLoader(result: Awaited<ReturnType<SupergraphOwnershipLoader['load']>>) {
    let loads = 0;
    const ownership: SupergraphOwnershipLoader = {
      load: async () => {
        loads += 1;
        return result;
      },
    };
    return { ownership, loads: () => loads };
  }
  const info = {
    schemaCoordinateServicesMappings: new Map([
      ['Query', ['users', 'reviews']],
      ['Query.me', ['users']],
      ['Query.reviews', ['reviews']],
      ['Review.body', ['reviews']],
      ['Sort.ASC', ['users', 'reviews']],
    ]),
    objectFieldCoordinates: new Set(['Query.me', 'Query.reviews', 'Review.body']),
  };

  test('no subgraph names -> ok without loading ownership', async () => {
    const { ownership, loads } = fakeLoader({ info, versionId: 'v1' });
    const result = await resolveSavedFilter(parsed({ schemaCoordinates: ['Query.me'] }), {
      targetId: 't1',
      ownership,
    });
    expect(result).toEqual({
      kind: 'ok',
      filter: { conditions: [], coordinateScopes: [['Query.me']] },
    });
    expect(loads()).toBe(0);
  });

  test('subgraph names resolve to the object fields they own, as their own scope', async () => {
    const { ownership } = fakeLoader({ info, versionId: 'v1' });
    const result = await resolveSavedFilter(
      parsed({ schemaCoordinates: ['Query.me'], subgraphNames: ['reviews'] }),
      { targetId: 't1', ownership },
    );
    expect(result).toEqual({
      kind: 'ok',
      filter: {
        conditions: [],
        coordinateScopes: [['Query.me'], ['Query.reviews', 'Review.body']],
      },
    });
  });

  test('an unknown subgraph skips the group and names it', async () => {
    const { ownership } = fakeLoader({ info, versionId: 'v1' });
    const result = await resolveSavedFilter(parsed({ subgraphNames: ['reviews', 'inventory'] }), {
      targetId: 't1',
      ownership,
    });
    expect(result).toEqual({ kind: 'skip', reason: 'unknown-subgraph', details: ['inventory'] });
  });

  test.each(['no-composable-version', 'no-supergraph-sdl', 'supergraph-parse-failed'] as const)(
    'a load failure (%s) skips with that reason',
    async reason => {
      const { ownership } = fakeLoader({ info: null, reason });
      const result = await resolveSavedFilter(parsed({ subgraphNames: ['reviews'] }), {
        targetId: 't1',
        ownership,
      });
      expect(result).toEqual({ kind: 'skip', reason });
    },
  );

  test('a resolved set over the budget skips as scope-too-large', async () => {
    const big = {
      schemaCoordinateServicesMappings: new Map(
        Array.from({ length: 3001 }, (_, i) => [`T${i}.f`, ['users']] as [string, string[]]),
      ),
      objectFieldCoordinates: new Set(Array.from({ length: 3001 }, (_, i) => `T${i}.f`)),
    };
    const { ownership } = fakeLoader({ info: big, versionId: 'v1' });
    const result = await resolveSavedFilter(parsed({ subgraphNames: ['users'] }), {
      targetId: 't1',
      ownership,
    });
    expect(result).toEqual({ kind: 'skip', reason: 'scope-too-large', details: ['3001'] });
  });
});

describe('queryClickHouseWindows', () => {
  function captureClient() {
    const calls: Array<{ sql: string; queryId: string; params?: Record<string, string> }> = [];
    const clickhouse = {
      query: async (sql: string, queryId: string, params?: Record<string, string>) => {
        calls.push({ sql, queryId, params });
        return [];
      },
    } as unknown as ClickHouseClient;
    return { clickhouse, calls };
  }

  const evalTime = new Date('2024-06-01T12:00:00.000Z');
  const target = '11111111-1111-1111-1111-111111111111';

  test('no filter -> target-keyed minutely rollup, no hash/client predicate, only target bound', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 60, EMPTY_RESOLVED_FILTER, evalTime);
    const { sql, params } = calls[0];
    // Unfiltered -> the target-keyed rollup. It dropped the hash/client
    // dimensions, so the query must emit no hash/client predicate.
    expect(sql).toContain('FROM operations_by_target_minutely');
    expect(sql).toContain('target = {p1: String}');
    expect(sql).not.toContain('client_name');
    expect(sql).not.toContain('hash');
    // The rollup stores percentiles as quantilesTDigest states.
    expect(sql).toContain('quantilesTDigestMerge(');
    expect(params).toEqual({ param_p1: target });
  });

  test('with a client filter -> legacy table, predicate composed and bound as a param (not interpolated)', async () => {
    const { clickhouse, calls } = captureClient();
    const conds = parseSavedFilter(
      { clientFilters: [{ name: 'web', versions: null }] },
      makeLogger().logger,
    ).conditions;
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      { conditions: conds, coordinateScopes: [] },
      evalTime,
    );
    const { sql, params } = calls[0];
    // A filtered query MUST stay on the legacy table — the rollup has no
    // hash/client columns to predicate on.
    expect(sql).toContain('FROM operations_minutely');
    expect(sql).not.toContain('_by_target');
    // The legacy table stores percentiles as the older quantiles states.
    expect(sql).toContain('quantilesMerge(');
    expect(sql).not.toContain('TDigest');
    // renumbered after the target param (p1)
    expect(sql).toContain('client_name = {p2: String}');
    expect(sql).not.toContain(`'web'`);
    expect(params).toMatchObject({ param_p1: target, param_p2: 'web' });
  });

  test('window > 360 minutes reads the hourly rollup', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 720, EMPTY_RESOLVED_FILTER, evalTime);
    expect(calls[0].sql).toContain('FROM operations_by_target_hourly');
  });

  test('windows below 7 days stay on the hourly rollup', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 1440, EMPTY_RESOLVED_FILTER, evalTime);
    await queryClickHouseWindows(clickhouse, target, 4320, EMPTY_RESOLVED_FILTER, evalTime);
    await queryClickHouseWindows(
      clickhouse,
      target,
      DAILY_THRESHOLD_MINUTES - 1,
      EMPTY_RESOLVED_FILTER,
      evalTime,
    );
    for (const call of calls) {
      expect(call.sql).toContain('FROM operations_by_target_hourly');
    }
  });

  test('windows >= 7 days read the daily rollup (unfiltered -> by_target)', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      DAILY_THRESHOLD_MINUTES,
      EMPTY_RESOLVED_FILTER,
      evalTime,
    );
    const { sql } = calls[0];
    expect(sql).toContain('FROM operations_by_target_daily');
    expect(sql).toContain('quantilesTDigestMerge(');
  });

  test('a TRAFFIC group (allowDailyRollup=false) stays on hourly at >= 7 days', async () => {
    const { clickhouse, calls } = captureClient();
    // trailing args: needsPreviousWindow, needsAverage, needsPercentiles, allowDailyRollup
    await queryClickHouseWindows(
      clickhouse,
      target,
      DAILY_THRESHOLD_MINUTES,
      EMPTY_RESOLVED_FILTER,
      evalTime,
      true,
      true,
      true,
      false,
    );
    expect(calls[0].sql).toContain('FROM operations_by_target_hourly');
    expect(calls[0].sql).not.toContain('_daily');
  });

  test('windows >= 7 days read the daily rollup (filtered -> legacy operations_daily)', async () => {
    const { clickhouse, calls } = captureClient();
    const conds = parseSavedFilter(
      { clientFilters: [{ name: 'web', versions: null }] },
      makeLogger().logger,
    ).conditions;
    await queryClickHouseWindows(
      clickhouse,
      target,
      DAILY_THRESHOLD_MINUTES,
      { conditions: conds, coordinateScopes: [] },
      evalTime,
    );
    const { sql } = calls[0];
    expect(sql).toContain('FROM operations_daily');
    expect(sql).not.toContain('_by_target');
    expect(sql).toContain('quantilesMerge(');
    expect(sql).not.toContain('TDigest');
    expect(sql).toContain('client_name = {p2: String}');
  });

  test('a coordinate scope -> legacy table with a hash subquery bounded to the scanned window', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      { conditions: [], coordinateScopes: [['Query.me', 'User.name']] },
      evalTime,
    );
    const { sql, params } = calls[0];
    expect(sql).toContain('FROM operations_minutely');
    expect(sql).not.toContain('_by_target');
    expect(sql).toContain(
      'hash IN (SELECT hash FROM coordinates_minutely PREWHERE target = {p2: String}',
    );
    // The subquery prunes by the same scan the outer query reads (previous window start to
    // current window end); the outer query already carries the same two bounds.
    const anchor = evalTime.getTime();
    const previousStart = String(anchor - 60_000 - 2 * 60 * 60_000);
    const currentEnd = String(anchor - 60_000);
    const subquery = sql.slice(sql.indexOf('(SELECT hash'));
    expect(subquery).toContain(`timestamp >= fromUnixTimestamp64Milli(${previousStart})`);
    expect(subquery).toContain(`timestamp < fromUnixTimestamp64Milli(${currentEnd})`);
    expect(subquery).toContain('coordinate IN ({p3: Array(String)})');
    expect(params).toEqual({
      param_p1: target,
      param_p2: target,
      param_p3: `['Query.me', 'User.name']`,
    });
  });

  test('two scopes are ANDed; a client condition stays alongside them', async () => {
    const { clickhouse, calls } = captureClient();
    const conds = parseSavedFilter(
      { clientFilters: [{ name: 'web', versions: null }] },
      makeLogger().logger,
    ).conditions;
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      { conditions: conds, coordinateScopes: [['Query.me'], ['Review.body']] },
      evalTime,
    );
    const { sql } = calls[0];
    expect(sql.match(/hash IN \(SELECT hash FROM coordinates_minutely/g)).toHaveLength(2);
    expect(sql).toContain('client_name = {p2: String}');
  });

  test('an empty scope matches nothing instead of falling back to the rollup', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      { conditions: [], coordinateScopes: [[]] },
      evalTime,
    );
    const { sql } = calls[0];
    expect(sql).toContain('FROM operations_minutely');
    expect(sql).toContain('AND 1 = 0');
  });

  test('a scope on a >= 7d latency group reads the daily coordinates tier', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      DAILY_THRESHOLD_MINUTES,
      { conditions: [], coordinateScopes: [['Query.me']] },
      evalTime,
    );
    expect(calls[0].sql).toContain('FROM operations_daily');
    expect(calls[0].sql).toContain('FROM coordinates_daily');
  });

  test('absolute-only groups skip the previous window (1x scan, constant label)', async () => {
    const { clickhouse, calls } = captureClient();
    const result = await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      EMPTY_RESOLVED_FILTER,
      evalTime,
      false,
    );
    const { sql } = calls[0];
    // Single-window query: constant 'current' label, no previous branch.
    expect(sql).toContain("'current' as window");
    expect(sql).not.toContain("'previous'");
    // Scans from the current window start, not the previous window start.
    const anchor = evalTime.getTime();
    const currentStart = anchor - 60_000 - 60 * 60_000;
    const previousStart = anchor - 60_000 - 2 * 60 * 60_000;
    expect(sql).toContain(String(currentStart));
    expect(sql).not.toContain(String(previousStart));
    // Previous reported null so the caller persists previousValue = null.
    expect(result.previous).toBeNull();
  });

  test('groups needing the previous window fetch both (default)', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 60, EMPTY_RESOLVED_FILTER, evalTime, true);
    const { sql } = calls[0];
    expect(sql).toContain("ELSE 'previous'");
    const anchor = evalTime.getTime();
    const previousStart = anchor - 60_000 - 2 * 60 * 60_000;
    expect(sql).toContain(String(previousStart));
  });

  // Args after evalTime are (needsPreviousWindow, needsAverage, needsPercentiles);
  // pass needsPreviousWindow=true so these exercise only the column selection.
  test('groups needing neither duration column select NULL placeholders', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      EMPTY_RESOLVED_FILTER,
      evalTime,
      true,
      false,
      false,
    );
    const { sql } = calls[0];
    expect(sql).toContain('NULL as average');
    expect(sql).toContain('NULL as percentiles');
    expect(sql).not.toContain('avgMerge(duration_avg)');
    expect(sql).not.toContain('duration_quantiles');
  });

  test('percentile groups select the quantiles column; avg still skipped', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      EMPTY_RESOLVED_FILTER,
      evalTime,
      true,
      false,
      true,
    );
    const { sql } = calls[0];
    expect(sql).toContain('duration_quantiles');
    expect(sql).toContain('NULL as average');
  });

  test('avg groups select avgMerge; percentiles skipped', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      EMPTY_RESOLVED_FILTER,
      evalTime,
      true,
      true,
      false,
    );
    const { sql } = calls[0];
    expect(sql).toContain('avgMerge(duration_avg) as average');
    expect(sql).toContain('NULL as percentiles');
    expect(sql).not.toContain('duration_quantiles');
  });
});

describe('previousValueForRule', () => {
  const prev = {
    window: 'previous' as const,
    total: '500',
    total_ok: '450',
    average: 0,
    percentiles: [0, 0, 0, 0] as [number, number, number, number],
  };

  test('FIXED_VALUE persists null even when the previous window was fetched', () => {
    // The window may have been fetched for a PERCENTAGE_CHANGE group-mate; a
    // FIXED_VALUE rule still persists null so its history is grouping-independent.
    expect(
      previousValueForRule(makeRule({ thresholdType: 'FIXED_VALUE', type: 'TRAFFIC' }), prev),
    ).toBeNull();
  });

  test('PERCENTAGE_CHANGE persists the real previous value', () => {
    expect(
      previousValueForRule(makeRule({ thresholdType: 'PERCENTAGE_CHANGE', type: 'TRAFFIC' }), prev),
    ).toBe(500);
  });

  test('PERCENTAGE_CHANGE with no previous window falls back to null', () => {
    expect(previousValueForRule(makeRule({ thresholdType: 'PERCENTAGE_CHANGE' }), null)).toBeNull();
  });
});

describe('extractMetricValue', () => {
  const row = (over: Partial<Parameters<typeof extractMetricValue>[0]> = {}) => ({
    window: 'current' as const,
    total: '1000',
    total_ok: '900',
    average: null,
    percentiles: null,
    ...over,
  });

  test('TRAFFIC returns the total count', () => {
    expect(extractMetricValue(row(), makeRule({ type: 'TRAFFIC' }))).toBe(1000);
  });

  test('ERROR_RATE returns the error percentage (0 when no traffic)', () => {
    expect(extractMetricValue(row(), makeRule({ type: 'ERROR_RATE' }))).toBeCloseTo(10);
    expect(
      extractMetricValue(row({ total: '0', total_ok: '0' }), makeRule({ type: 'ERROR_RATE' })),
    ).toBe(0);
  });

  test('LATENCY converts the selected column from nanoseconds to ms', () => {
    expect(
      extractMetricValue(row({ average: 1.2e9 }), makeRule({ type: 'LATENCY', metric: 'AVG' })),
    ).toBe(1200);
    // percentiles tuple is [P75, P90, P95, P99]; P95 is index 2.
    expect(
      extractMetricValue(
        row({ percentiles: [1e9, 2e9, 3e9, 4e9] }),
        makeRule({ type: 'LATENCY', metric: 'P95' }),
      ),
    ).toBe(3000);
  });

  test('a LATENCY rule whose duration column was not selected throws (no silent 0)', () => {
    expect(() =>
      extractMetricValue(row({ average: null }), makeRule({ type: 'LATENCY', metric: 'AVG' })),
    ).toThrow(/duration_avg/);
    expect(() =>
      extractMetricValue(row({ percentiles: null }), makeRule({ type: 'LATENCY', metric: 'P95' })),
    ).toThrow(/duration_quantiles/);
  });
});
