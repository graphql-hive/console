import type { Logger } from '@graphql-hive/logger';
import { printWithValues, type SqlValue } from '@hive/clickhouse';
import type { ClickHouseClient } from './clickhouse-client.js';
import {
  buildSavedFilterConditions,
  deriveGroupNeeds,
  evaluationIntervalMinutes,
  groupRulesByQuery,
  isRuleDue,
  queryClickHouseWindows,
  type GroupNeeds,
  type MetricAlertRuleRow,
} from './metric-alert-evaluator.js';

// Minimal logger that records warn() calls so we can assert defensive logging.
function makeLogger() {
  const warnings: unknown[][] = [];
  const logger = {
    warn: (...args: unknown[]) => warnings.push(args),
    info: () => {},
    error: () => {},
    debug: () => {},
    child: () => logger,
  } as unknown as Logger;
  return { logger, warnings };
}

const render = (conds: SqlValue[]) => conds.map(c => printWithValues(c));

function makeRule(overrides: Partial<MetricAlertRuleRow>): MetricAlertRuleRow {
  return {
    id: 'r1',
    organizationId: 'o1',
    projectId: 'p1',
    targetId: 't1',
    name: 'rule',
    type: 'TRAFFIC',
    timeWindowMinutes: 60,
    metric: null,
    thresholdType: 'FIXED_VALUE',
    thresholdValue: 100,
    direction: 'ABOVE',
    severity: 'WARNING',
    state: 'NORMAL',
    stateChangedAt: null,
    lastEvaluatedAt: null,
    confirmationMinutes: 0,
    savedFilterId: null,
    savedFilterFilters: null,
    organizationPlanName: 'PRO',
    ...overrides,
  };
}

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
    expect(evaluationIntervalMinutes(43200)).toBe(30);
  });

  test('interval never exceeds the window, so the dwell stays sampled', () => {
    for (const window of [1, 60, 61, 360, 361, 1440, 1441, 10080, 43200]) {
      expect(evaluationIntervalMinutes(window)).toBeLessThanOrEqual(window);
    }
  });
});

describe('isRuleDue', () => {
  const evalTime = new Date('2026-07-08T12:00:00.000Z');
  // ISO timestamp for a point `minutes` before evalTime (mirrors the `to_json`
  // timestamp string fetchEnabledRules returns for last_evaluated_at).
  const ago = (minutes: number) => new Date(evalTime.getTime() - minutes * 60_000).toISOString();

  test('a never-evaluated rule is always due', () => {
    expect(isRuleDue(makeRule({ lastEvaluatedAt: null, timeWindowMinutes: 43200 }), evalTime)).toBe(
      true,
    );
  });

  test('30-day rule: due once its 30-min interval has elapsed', () => {
    const base = { timeWindowMinutes: 43200, state: 'NORMAL' as const };
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(0) }), evalTime)).toBe(false);
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(29) }), evalTime)).toBe(false);
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(30) }), evalTime)).toBe(true);
    expect(isRuleDue(makeRule({ ...base, lastEvaluatedAt: ago(31) }), evalTime)).toBe(true);
  });

  test('sub-second tolerance only: 5s short of the interval is still not due', () => {
    const almost = new Date(evalTime.getTime() - (30 * 60_000 - 5_000)).toISOString();
    expect(
      isRuleDue(
        makeRule({ timeWindowMinutes: 43200, state: 'NORMAL', lastEvaluatedAt: almost }),
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
        isRuleDue(makeRule({ timeWindowMinutes: 43200, state, lastEvaluatedAt: ago(1) }), evalTime),
      ).toBe(true);
    }
    // The same 30-day rule in a steady state, 1 min after eval, is NOT due.
    for (const state of ['NORMAL', 'FIRING'] as const) {
      expect(
        isRuleDue(makeRule({ timeWindowMinutes: 43200, state, lastEvaluatedAt: ago(1) }), evalTime),
      ).toBe(false);
    }
  });
});

describe('buildSavedFilterConditions', () => {
  test('null filters -> no conditions', () => {
    const { logger } = makeLogger();
    expect(buildSavedFilterConditions(null, logger)).toEqual([]);
  });

  test('builds hash + client-version conditions from a saved filter', () => {
    const { logger } = makeLogger();
    const conds = buildSavedFilterConditions(
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
    );
    expect(render(conds)).toEqual([
      `(hash) IN (['h1', 'h2'])`,
      `((client_name = 'web' AND client_version IN (['1.0'])) OR (client_name = 'mobile'))`,
    ]);
  });

  test('ignores dateRange — the alert uses its own rolling window', () => {
    const { logger } = makeLogger();
    const conds = buildSavedFilterConditions(
      { operationHashes: ['h1'], dateRange: { from: '2024-01-01', to: '2024-02-01' } },
      logger,
    );
    const rendered = render(conds);
    expect(rendered).toEqual([`(hash) IN (['h1'])`]);
    expect(rendered.join(' ')).not.toContain('timestamp');
  });

  test(`'unknown' client maps to empty string`, () => {
    const { logger } = makeLogger();
    expect(
      render(
        buildSavedFilterConditions(
          { clientFilters: [{ name: 'unknown', versions: null }] },
          logger,
        ),
      ),
    ).toEqual([`((client_name = ''))`]);
  });

  test('malformed filters -> no conditions + warns, and never throws (isolated)', () => {
    const { logger, warnings } = makeLogger();
    // clientFilters must be an array of objects; a string is malformed.
    const conds = buildSavedFilterConditions({ clientFilters: 'oops' }, logger);
    expect(conds).toEqual([]);
    expect(warnings.length).toBe(1);
  });
});

describe('deriveGroupNeeds', () => {
  const { logger } = makeLogger();

  test('error/traffic-only group needs neither duration column nor previous window', () => {
    const n = deriveGroupNeeds(
      [makeRule({ type: 'ERROR_RATE' }), makeRule({ type: 'TRAFFIC' })],
      logger,
    );
    expect(n).toMatchObject({
      needsPreviousWindow: false,
      needsAverage: false,
      needsPercentiles: false,
    });
  });

  test('a single PERCENTAGE_CHANGE rule flips the whole group to fetch the previous window', () => {
    const n = deriveGroupNeeds(
      [
        makeRule({ thresholdType: 'FIXED_VALUE' }),
        makeRule({ thresholdType: 'PERCENTAGE_CHANGE' }),
      ],
      logger,
    );
    expect(n.needsPreviousWindow).toBe(true);
  });

  test('LATENCY metrics select their columns; AVG and percentiles are independent', () => {
    expect(deriveGroupNeeds([makeRule({ type: 'LATENCY', metric: 'AVG' })], logger)).toMatchObject({
      needsAverage: true,
      needsPercentiles: false,
    });
    expect(deriveGroupNeeds([makeRule({ type: 'LATENCY', metric: 'P95' })], logger)).toMatchObject({
      needsAverage: false,
      needsPercentiles: true,
    });
    // A mixed AVG + percentile latency group needs both.
    expect(
      deriveGroupNeeds(
        [
          makeRule({ type: 'LATENCY', metric: 'AVG' }),
          makeRule({ type: 'LATENCY', metric: 'P99' }),
        ],
        logger,
      ),
    ).toMatchObject({ needsAverage: true, needsPercentiles: true });
  });

  test('builds filter conditions from the representative saved filter', () => {
    const filters = { clientFilters: [{ name: 'web', versions: null }] };
    const filtered = deriveGroupNeeds([makeRule({ savedFilterFilters: filters })], logger);
    expect(filtered.filterConditions.length).toBeGreaterThan(0);
    expect(
      deriveGroupNeeds([makeRule({ savedFilterFilters: null })], logger).filterConditions,
    ).toEqual([]);
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

  // Full query shape by default (both windows, both duration columns, no filter);
  // override just the field a test exercises.
  const needs = (overrides: Partial<GroupNeeds> = {}): GroupNeeds => ({
    filterConditions: [],
    needsPreviousWindow: true,
    needsAverage: true,
    needsPercentiles: true,
    ...overrides,
  });

  test('no filter -> target-keyed minutely rollup, no hash/client predicate, only target bound', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 60, evalTime, needs());
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
    const conds = buildSavedFilterConditions(
      { clientFilters: [{ name: 'web', versions: null }] },
      makeLogger().logger,
    );
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      evalTime,
      needs({ filterConditions: conds }),
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
    await queryClickHouseWindows(clickhouse, target, 720, evalTime, needs());
    expect(calls[0].sql).toContain('FROM operations_by_target_hourly');
  });

  test('windows below 7 days stay on the hourly rollup', async () => {
    const { clickhouse, calls } = captureClient();
    // 1 day, 3 days, and one minute under the 7-day cutoff all read hourly.
    await queryClickHouseWindows(clickhouse, target, 1440, evalTime, needs());
    await queryClickHouseWindows(clickhouse, target, 4320, evalTime, needs());
    await queryClickHouseWindows(clickhouse, target, 10079, evalTime, needs());
    for (const call of calls) {
      expect(call.sql).toContain('FROM operations_by_target_hourly');
    }
  });

  test('windows >= 7 days read the daily rollup (unfiltered -> by_target)', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 10080, evalTime, needs());
    const { sql } = calls[0];
    expect(sql).toContain('FROM operations_by_target_daily');
    expect(sql).toContain('quantilesTDigestMerge(');
  });

  test('windows >= 7 days read the daily rollup (filtered -> legacy operations_daily)', async () => {
    const { clickhouse, calls } = captureClient();
    const conds = buildSavedFilterConditions(
      { clientFilters: [{ name: 'web', versions: null }] },
      makeLogger().logger,
    );
    await queryClickHouseWindows(
      clickhouse,
      target,
      43200,
      evalTime,
      needs({ filterConditions: conds }),
    );
    const { sql } = calls[0];
    expect(sql).toContain('FROM operations_daily');
    expect(sql).not.toContain('_by_target');
    expect(sql).toContain('quantilesMerge(');
    expect(sql).not.toContain('TDigest');
    expect(sql).toContain('client_name = {p2: String}');
  });

  test('absolute-only groups skip the previous window (1x scan, constant label)', async () => {
    const { clickhouse, calls } = captureClient();
    const result = await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      evalTime,
      needs({ needsPreviousWindow: false }),
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
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      evalTime,
      needs({ needsPreviousWindow: true }),
    );
    const { sql } = calls[0];
    expect(sql).toContain("ELSE 'previous'");
    const anchor = evalTime.getTime();
    const previousStart = anchor - 60_000 - 2 * 60 * 60_000;
    expect(sql).toContain(String(previousStart));
  });

  test('groups needing neither duration column select NULL placeholders', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(
      clickhouse,
      target,
      60,
      evalTime,
      needs({ needsAverage: false, needsPercentiles: false }),
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
      evalTime,
      needs({ needsAverage: false, needsPercentiles: true }),
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
      evalTime,
      needs({ needsAverage: true, needsPercentiles: false }),
    );
    const { sql } = calls[0];
    expect(sql).toContain('avgMerge(duration_avg) as average');
    expect(sql).toContain('NULL as percentiles');
    expect(sql).not.toContain('duration_quantiles');
  });
});
