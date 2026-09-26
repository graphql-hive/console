import type { Action } from '../clickhouse';

/**
 * Insert deduplication needs a log of recent block ids. Replicated tables and ClickHouse
 * Cloud's SharedMergeTree keep one in Keeper by default; a plain MergeTree table keeps
 * none until `non_replicated_deduplication_window` is set. The usage ingestor tags every
 * insert with a deduplication token so a retried or replayed Kafka message is written once,
 * which only holds if every table it writes to, directly or through a materialized view,
 * has such a log.
 *
 * ClickHouse deduplicates coalesced async inserts individually on plain MergeTree from 26.1 and
 * accepts them together with deduplication in dependent materialized views from 26.2; older
 * servers reject the ingestor's inserts outright.
 *
 * This action only covers tables that exist when it runs. New MergeTree tables must declare
 * `non_replicated_deduplication_window` in their `SETTINGS` clause.
 */
export const action: Action = async (exec, query) => {
  const result = await query(`
    SELECT database, name
    FROM system.tables
    WHERE database = currentDatabase()
      AND engine LIKE '%MergeTree'
      AND engine NOT LIKE 'Replicated%'
      AND engine NOT LIKE 'Shared%'
  `);

  for (const row of result.data as Array<{ database: string; name: string }>) {
    await exec(`
      ALTER TABLE "${row.database}"."${row.name}"
      MODIFY SETTING non_replicated_deduplication_window = 10000
    `);
  }
};
