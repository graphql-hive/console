import { SLUGS } from './layouts';

const TARGET_ID = 'target-1';

export const BLOCKED_RULE = {
  id: 'rule-1',
  name: 'Orders traffic',
  since: '2026-10-29T10:00:00.000Z',
  message:
    'The filter\'s subgraph "orders" is not in the latest schema version. Update the saved filter, or publish the subgraph again.',
} as const;

function evaluationBlocked(blocked: boolean) {
  return blocked
    ? {
        __typename: 'MetricAlertRuleEvaluationBlock' as const,
        since: BLOCKED_RULE.since,
        message: BLOCKED_RULE.message,
      }
    : null;
}

/** The rules list with one enabled TRAFFIC rule, blocked or not. */
export function alertRulesPage({ blocked = false } = {}) {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      metricAlertRulesLimit: 10,
      metricAlertRules: [
        {
          __typename: 'MetricAlertRule' as const,
          id: BLOCKED_RULE.id,
          name: BLOCKED_RULE.name,
          type: 'TRAFFIC',
          severity: 'INFO',
          state: 'NORMAL',
          enabled: true,
          lastTriggeredAt: null,
          updatedAt: '2026-10-01T00:00:00.000Z',
          incidentCount: 0,
          evaluationBlocked: evaluationBlocked(blocked),
          channels: [],
          createdBy: { __typename: 'User' as const, id: 'user-1', displayName: 'User' },
        },
      ],
    },
  };
}

/** The detail page's configuration document for the same rule, on a shared saved filter. */
export function alertRuleConfig({ blocked = false } = {}) {
  return {
    __typename: 'Query' as const,
    target: {
      __typename: 'Target' as const,
      id: TARGET_ID,
      metricAlertRule: {
        __typename: 'MetricAlertRule' as const,
        id: BLOCKED_RULE.id,
        name: BLOCKED_RULE.name,
        type: 'TRAFFIC',
        metric: null,
        severity: 'INFO',
        state: 'NORMAL',
        enabled: true,
        timeWindowMinutes: 5,
        thresholdType: 'FIXED_VALUE',
        thresholdValue: 20,
        direction: 'ABOVE',
        confirmationMinutes: 0,
        evaluationBlocked: evaluationBlocked(blocked),
        channels: [],
        savedFilter: {
          __typename: 'SavedFilter' as const,
          id: 'filter-1',
          name: 'Orders subgraph',
          filters: {
            __typename: 'InsightsFilterConfiguration' as const,
            operationHashes: [],
            clientFilters: [],
            dateRange: null,
            excludeOperations: false,
            excludeClientFilters: false,
            schemaCoordinates: [],
            subgraphNames: ['orders'],
          },
        },
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
        createdBy: { __typename: 'User' as const, id: 'user-1', displayName: 'User' },
        updatedBy: null,
      },
    },
  };
}

export const ALERTS_PATH = `/${SLUGS.organizationSlug}/${SLUGS.projectSlug}/${SLUGS.targetSlug}/alerts`;
