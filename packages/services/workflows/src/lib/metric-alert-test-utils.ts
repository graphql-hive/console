import type { Logger } from '@graphql-hive/logger';
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
    ...overrides,
  };
}
