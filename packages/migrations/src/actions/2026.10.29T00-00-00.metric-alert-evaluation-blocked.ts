import type { MigrationExecutor } from '../pg-migrator';

// Set by the workflows evaluator when a rule's saved filter cannot be resolved against the
// target's latest composable schema version (an unknown subgraph, no supergraph, ...), and
// cleared on the next successful evaluation. Null means the rule evaluates normally.
export default {
  name: '2026.10.29T00-00-00.metric-alert-evaluation-blocked.ts',
  run: ({ psql }) => psql`
    ALTER TABLE "metric_alert_rules"
      ADD COLUMN "evaluation_blocked_reason" text
      , ADD COLUMN "evaluation_blocked_since" timestamptz
      , ADD COLUMN "evaluation_blocked_details" text[]
    ;
  `,
} satisfies MigrationExecutor;
