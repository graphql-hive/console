import { sql, type SqlValue } from './sql';

export type OperationsFilterInput = {
  /** Operation hashes to include (or exclude when `excludeOperations`). */
  operations?: readonly string[];
  /** Client names to include (matches any version of each). */
  clients?: readonly string[];
  /** Per-client version filters; `versions: null` means all versions of that client. */
  clientVersionFilters?: readonly { clientName: string; versions: readonly string[] | null }[];
  excludeOperations?: boolean;
  excludeClientVersionFilters?: boolean;
  /** Table alias; when set, columns are prefixed `${namespace}.` (e.g. for aliased/joined queries). */
  namespace?: string;
};

/**
 * Builds the operation-hash and client(/version) ClickHouse conditions shared by
 * the analytics API (`OperationsReader.createFilter`) and the metric-alert worker.
 *
 * Returns an array of AND-able `SqlValue` conditions (mirrors the sibling
 * `buildTraceFilterSQLConditions`); the caller is responsible for combining them
 * (PREWHERE / WHERE) and for the orthogonal `target`/`period`/`extra` predicates.
 */
export function buildOperationsFilterSQLConditions(input: OperationsFilterInput): SqlValue[] {
  const {
    operations,
    clients,
    clientVersionFilters,
    excludeOperations,
    excludeClientVersionFilters,
    namespace,
  } = input;

  const columnPrefix = sql.raw(namespace ? `${namespace}.` : '');
  const conditions: SqlValue[] = [];

  if (operations?.length) {
    if (excludeOperations) {
      conditions.push(sql`(${columnPrefix}hash) NOT IN (${sql.array(operations, 'String')})`);
    } else {
      conditions.push(sql`(${columnPrefix}hash) IN (${sql.array(operations, 'String')})`);
    }
  }

  if (clients?.length) {
    // Uses `columnPrefix` (with the trailing `.`) like the hash and client-version
    // branches...fixes a latent bug where this branch emitted `${namespace}client_name`.
    conditions.push(sql`${columnPrefix}client_name IN (${sql.array(clients, 'String')})`);
  }

  if (clientVersionFilters?.length) {
    // Build OR conditions for each client+versions combination.
    const versionConditions = clientVersionFilters.map(filter => {
      const clientName = filter.clientName === 'unknown' ? '' : filter.clientName;
      if (!filter.versions?.length) {
        // null/empty versions = all versions of this client
        return sql`(${columnPrefix}client_name = ${clientName})`;
      }
      return sql`(${columnPrefix}client_name = ${clientName} AND ${columnPrefix}client_version IN (${sql.array(filter.versions, 'String')}))`;
    });
    if (excludeClientVersionFilters) {
      conditions.push(sql`NOT (${sql.join(versionConditions, ' OR ')})`);
    } else {
      conditions.push(sql`(${sql.join(versionConditions, ' OR ')})`);
    }
  }

  return conditions;
}
