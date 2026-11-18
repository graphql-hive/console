import { sql, type RawValue, type SqlValue } from './sql';

/**
 * How a table stores the operation hash (the md5 of the normalized operation):
 * - `hex`: the md5 hex `String`, as the API reads and returns hashes
 *   (`operations`, `operation_collection_*`, `subscription_operations_*` and the legacy rollups)
 * - `binary`: the raw md5 as `FixedString(16)`
 *   (all `*_by_graph_*` rollups and the legacy `coordinate_counts_*` / `coordinate_errors_*`)
 */
export type HashEncoding = 'hex' | 'binary';

/**
 * Converts a hash expression between encodings, e.g. to compare or join tables that store it
 * differently, or to return a binary hash as hex.
 *
 * When converting a selected column, do not alias it as `hash` in a query that also filters on
 * `hash`: ClickHouse substitutes aliases in `WHERE`/`PREWHERE`, so the filter would compare against
 * the converted value. Convert in an outer query instead.
 */
export function convertHash(
  expression: SqlValue | RawValue,
  from: HashEncoding,
  to: HashEncoding,
): SqlValue {
  if (from === to) {
    return sql`${expression}`;
  }

  return from === 'binary' ? sql`lower(hex(${expression}))` : sql`unhex(${expression})`;
}

/**
 * A list of md5 hex hashes (e.g. API input) to compare against a column with the given encoding.
 * `long` splits the list into several parameters (`sql.longArray`), for lists of arbitrary size.
 */
export function hashList(
  hashes: readonly string[],
  encoding: HashEncoding,
  { long = false }: { long?: boolean } = {},
): SqlValue {
  const list = long ? sql.longArray(hashes, 'String') : sql.array(hashes, 'String');
  return encoding === 'binary' ? sql`arrayMap(h -> unhex(h), ${list})` : sql`${list}`;
}
