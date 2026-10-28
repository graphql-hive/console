import { sql, type RawValue, type SqlValue } from './sql';

export type CoordinateScopeInput = {
  /** The `coordinates_*` tier matching the outer query, e.g. `sql.raw('coordinates_hourly')`. */
  coordinatesTable: RawValue;
  /**
   * Target and time-bound predicates for the subquery, unprefixed. Coordinates are a function
   * of the operation document, so these only prune the scan and never change which hashes match.
   */
  scopeConditions: readonly SqlValue[];
  /** Schema coordinates as reported by usage (`Type.field`, `Type.field.arg`, `Enum.VALUE`). */
  coordinates: readonly string[];
  /** Table alias of the outer query; prefixes only the outer `hash`. */
  namespace?: string;
};

/**
 * Restricts an `operations_*` or `clients_*` query to the operations whose document uses any of
 * the given coordinates, via `hash IN (SELECT hash FROM coordinates_* ...)`. Shared by the
 * analytics API and the metric-alert worker so both scope identically.
 *
 * An empty coordinate list matches nothing: the caller asked for a scope and no operation can be
 * in it, which differs from asking for no scope at all.
 */
export function buildCoordinateScopeCondition(input: CoordinateScopeInput): SqlValue {
  const { coordinatesTable, scopeConditions, coordinates, namespace } = input;

  if (coordinates.length === 0) {
    return sql`1 = 0`;
  }

  const columnPrefix = sql.raw(namespace ? `${namespace}.` : '');
  const conditions = [
    ...scopeConditions,
    sql`coordinate IN (${sql.longArray(coordinates, 'String')})`,
  ];

  return sql`${columnPrefix}hash IN (SELECT hash FROM ${coordinatesTable} PREWHERE ${sql.join(conditions, ' AND ')})`;
}
