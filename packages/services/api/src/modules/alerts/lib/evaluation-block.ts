import { MAX_RESOLVED_SUBGRAPH_COORDINATES } from '@hive/supergraph';
import type { MetricAlertRuleEvaluationBlockReason } from '../../../__generated__/types';

/**
 * The reasons the workflows evaluator writes to `metric_alert_rules.evaluation_blocked_reason`
 * (`SavedFilterSkipReason` in packages/services/workflows). Workflows cannot be imported here,
 * so the two lists are kept in sync by hand; an unrecognised value reads as "not blocked".
 */
const REASONS: Record<string, MetricAlertRuleEvaluationBlockReason> = {
  'no-composable-version': 'NO_COMPOSABLE_VERSION',
  'no-supergraph-sdl': 'NO_SUPERGRAPH_SDL',
  'supergraph-parse-failed': 'SUPERGRAPH_PARSE_FAILED',
  'unknown-subgraph': 'UNKNOWN_SUBGRAPH',
  'scope-too-large': 'SCOPE_TOO_LARGE',
};

export type EvaluationBlock = {
  reason: MetricAlertRuleEvaluationBlockReason;
  since: string;
  message: string;
};

export function evaluationBlockOf(rule: {
  evaluationBlockedReason: string | null;
  evaluationBlockedSince: string | null;
  evaluationBlockedDetails: string[] | null;
}): EvaluationBlock | null {
  if (!rule.evaluationBlockedReason || !rule.evaluationBlockedSince) {
    return null;
  }
  const reason = REASONS[rule.evaluationBlockedReason];
  if (!reason) {
    return null;
  }
  return {
    reason,
    since: rule.evaluationBlockedSince,
    message: describeEvaluationBlock(reason, rule.evaluationBlockedDetails ?? []),
  };
}

export function describeEvaluationBlock(
  reason: MetricAlertRuleEvaluationBlockReason,
  details: readonly string[],
): string {
  switch (reason) {
    case 'UNKNOWN_SUBGRAPH': {
      const names = details.map(name => `"${name}"`).join(', ');
      return details.length === 1
        ? `The filter's subgraph ${names} is not in the latest schema version. Update the saved filter, or publish the subgraph again.`
        : `The filter's subgraphs ${names} are not in the latest schema version. Update the saved filter, or publish them again.`;
    }
    case 'NO_COMPOSABLE_VERSION':
      return "The target has no composable schema version to resolve the filter's subgraphs against. Publish a composable version.";
    case 'NO_SUPERGRAPH_SDL':
      return "The latest schema version has no stored supergraph, so the filter's subgraphs cannot be resolved. Publish a new version.";
    case 'SUPERGRAPH_PARSE_FAILED':
      return "The latest schema version's supergraph could not be parsed, so the filter's subgraphs cannot be resolved.";
    case 'SCOPE_TOO_LARGE':
      return `The filter's subgraphs own ${details[0] ?? 'too many'} fields, more than the ${MAX_RESOLVED_SUBGRAPH_COORDINATES} a filter can scope. Filter by fields instead.`;
  }
}
