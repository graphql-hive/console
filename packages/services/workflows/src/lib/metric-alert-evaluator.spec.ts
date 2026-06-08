import type { Logger } from '@graphql-hive/logger';
import { printWithValues, type SqlValue } from '@hive/clickhouse';
import type { ClickHouseClient } from './clickhouse-client.js';
import {
  buildSavedFilterConditions,
  groupRulesByQuery,
  queryClickHouseWindows,
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

  test('no filter -> target + timestamp only, no filter predicate, only target bound', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 60, [], evalTime);
    const { sql, params } = calls[0];
    expect(sql).toContain('FROM operations_minutely');
    expect(sql).toContain('target = {p1: String}');
    expect(sql).not.toContain('client_name');
    expect(params).toEqual({ param_p1: target });
  });

  test('with a client filter -> predicate composed and value bound as a param (not interpolated)', async () => {
    const { clickhouse, calls } = captureClient();
    const conds = buildSavedFilterConditions(
      { clientFilters: [{ name: 'web', versions: null }] },
      makeLogger().logger,
    );
    await queryClickHouseWindows(clickhouse, target, 60, conds, evalTime);
    const { sql, params } = calls[0];
    // renumbered after the target param (p1)
    expect(sql).toContain('client_name = {p2: String}');
    expect(sql).not.toContain(`'web'`);
    expect(params).toMatchObject({ param_p1: target, param_p2: 'web' });
  });

  test('window > 360 minutes reads the hourly rollup', async () => {
    const { clickhouse, calls } = captureClient();
    await queryClickHouseWindows(clickhouse, target, 720, [], evalTime);
    expect(calls[0].sql).toContain('FROM operations_hourly');
  });
});
