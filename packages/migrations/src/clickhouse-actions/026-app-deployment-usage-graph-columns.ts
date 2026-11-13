import type { Action } from '../clickhouse';

/**
 * Adds the `graph_id` and `graph_version_id` dimensions to `app_deployment_usage`.
 *
 * Kept separate from 025 because the sorting key change can't use `IF NOT EXISTS`;
 * a single statement per migration keeps each one atomic and safely re-runnable.
 */
export const action: Action = async exec => {
  await exec(`
    ALTER TABLE app_deployment_usage
      ADD COLUMN graph_id UUID CODEC(ZSTD(1)) AFTER app_version,
      ADD COLUMN graph_version_id UUID CODEC(ZSTD(1)) AFTER graph_id,
      MODIFY ORDER BY (target_id, app_name, app_version, graph_id, graph_version_id)
  `);
};
