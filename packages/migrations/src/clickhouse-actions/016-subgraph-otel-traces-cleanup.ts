import type { Action } from '../clickhouse';

export const action: Action = async exec => {
  await exec(`
    DROP VIEW IF EXISTS "otel_subgraph_spans_mv";
  `);
  await exec(`
    DROP TABLE IF EXISTS "otel_subgraph_spans";
  `);
};
