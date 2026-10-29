import { buildCoordinateScopeCondition } from './coordinate-scope';
import { printWithValues, sql } from './sql';

const table = sql.raw('coordinates_hourly');
const scope = [
  sql`target = ${'t1'}`,
  sql`timestamp >= toDateTime(${'2024-01-01 00:00:00'}, 'UTC')`,
];

describe('buildCoordinateScopeCondition', () => {
  test('one coordinate', () => {
    const cond = buildCoordinateScopeCondition({
      coordinatesTable: table,
      scopeConditions: scope,
      coordinates: ['Query.me'],
    });
    expect(printWithValues(cond)).toBe(
      `hash IN (SELECT hash FROM coordinates_hourly PREWHERE target = 't1' AND timestamp >= toDateTime('2024-01-01 00:00:00', 'UTC') AND coordinate IN (['Query.me']))`,
    );
  });

  test('many coordinates bind as one array param after the scope params', () => {
    const cond = buildCoordinateScopeCondition({
      coordinatesTable: table,
      scopeConditions: scope,
      coordinates: ['Query.me', 'User.id', 'User.name'],
    });
    expect(cond.sql).toContain('target = {p1: String}');
    expect(cond.sql).toContain('toDateTime({p2: String}');
    expect(cond.sql).toContain('coordinate IN ({p3: Array(String)})');
    expect(cond.values).toEqual([
      't1',
      '2024-01-01 00:00:00',
      ['Query.me', 'User.id', 'User.name'],
    ]);
  });

  test('a long coordinate list is batched with arrayConcat', () => {
    const coordinates = Array.from({ length: 1500 }, (_, i) => `Type${i}.field${i}`);
    const cond = buildCoordinateScopeCondition({
      coordinatesTable: table,
      scopeConditions: [],
      coordinates,
    });
    expect(cond.sql).toContain(
      'coordinate IN (arrayConcat({p1: Array(String)}, {p2: Array(String)}',
    );
    expect(cond.values.flat()).toEqual(coordinates);
  });

  test('empty coordinates match nothing', () => {
    const cond = buildCoordinateScopeCondition({
      coordinatesTable: table,
      scopeConditions: scope,
      coordinates: [],
    });
    expect(cond.sql).toBe('1 = 0');
    expect(cond.values).toEqual([]);
  });

  test('empty scope conditions leave only the coordinate predicate', () => {
    const cond = buildCoordinateScopeCondition({
      coordinatesTable: table,
      scopeConditions: [],
      coordinates: ['Query.me'],
    });
    expect(printWithValues(cond)).toBe(
      `hash IN (SELECT hash FROM coordinates_hourly PREWHERE coordinate IN (['Query.me']))`,
    );
  });

  test('namespace prefixes the outer hash only', () => {
    const cond = buildCoordinateScopeCondition({
      coordinatesTable: sql.raw('coordinates_daily'),
      scopeConditions: [sql`target = ${'t1'}`],
      coordinates: ['Query.me'],
      namespace: 'o',
    });
    expect(printWithValues(cond)).toBe(
      `o.hash IN (SELECT hash FROM coordinates_daily PREWHERE target = 't1' AND coordinate IN (['Query.me']))`,
    );
    expect(cond.sql).not.toContain('SELECT o.hash');
  });

  // Coordinates come from user input; they are bound params, never interpolated into the SQL.
  describe('injection safety (bound params)', () => {
    test('a hostile coordinate lands in values, not sql', () => {
      const evil = `Query.me']) OR 1=1; DROP TABLE operations; --`;
      const cond = buildCoordinateScopeCondition({
        coordinatesTable: table,
        scopeConditions: [],
        coordinates: [evil],
      });
      expect(cond.sql).not.toContain('DROP TABLE');
      expect(cond.sql).toContain('{p1: Array(String)}');
      expect(cond.values).toEqual([[evil]]);
    });
  });
});
