import type { Logger } from '@graphql-hive/logger';
import type { CommonQueryMethods } from '@hive/postgres';
import type { MetricAlertRuleRow } from './metric-alert-evaluator.js';

/** Minimal logger that records warn() calls so specs can assert defensive logging. */
export function makeLogger() {
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

export function makeRule(overrides: Partial<MetricAlertRuleRow> = {}): MetricAlertRuleRow {
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
    evaluationBlockedReason: null,
    evaluationBlockedDetails: null,
    ...overrides,
  };
}

/**
 * Stub of the Postgres methods the evaluator's lib uses. `answer` receives a read query's SQL
 * text and bound values and returns the first column of the first row; writes are recorded
 * only. Every call is recorded so specs can assert how often each query ran.
 */
export function makePg(answer: (sql: string, values: readonly unknown[]) => unknown = () => null) {
  const calls: Array<{ sql: string; values: readonly unknown[] }> = [];
  const pg = {
    maybeOneFirst: async (query: { sql: string; values: readonly unknown[] }) => {
      calls.push({ sql: query.sql, values: query.values });
      return answer(query.sql, query.values);
    },
    query: async (query: { sql: string; values: readonly unknown[] }) => {
      calls.push({ sql: query.sql, values: query.values });
    },
  } as unknown as Pick<CommonQueryMethods, 'maybeOneFirst' | 'query'>;
  return { pg, calls };
}
