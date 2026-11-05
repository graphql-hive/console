/**
 * Why the workflows evaluator could not resolve a saved filter's subgraphs. Written to
 * `metric_alert_rules.evaluation_blocked_reason` by workflows and read back by the API, so
 * both packages take the list from here.
 */
export const SAVED_FILTER_SKIP_REASONS = [
  'no-composable-version',
  'no-supergraph-sdl',
  'supergraph-parse-failed',
  'unknown-subgraph',
  'scope-too-large',
] as const;

export type SavedFilterSkipReason = (typeof SAVED_FILTER_SKIP_REASONS)[number];
