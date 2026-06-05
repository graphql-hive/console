import { OperationsReader } from '../providers/operations-reader';
import { printWithValues, sql, type SqlValue } from '@hive/clickhouse';

const reader = new OperationsReader(null as any, null as any);

const period = {
  from: new Date('2024-01-01T00:00:00.000Z'),
  to: new Date('2024-01-02T00:00:00.000Z'),
};

const render = (filter: SqlValue) => printWithValues(filter);

describe('OperationsReader.createFilter (characterization)', () => {
  test('no args -> empty statement', () => {
    expect(reader.createFilter({}).sql).toBe('');
  });

  test('target (single)', () => {
    expect(render(reader.createFilter({ target: 't1' }))).toMatchInlineSnapshot(
      `PREWHERE target = 't1'`,
    );
  });

  test('target (array)', () => {
    expect(render(reader.createFilter({ target: ['t1', 't2'] }))).toMatchInlineSnapshot(
      `PREWHERE target IN (['t1', 't2'])`,
    );
  });

  test('target + period', () => {
    expect(render(reader.createFilter({ target: 't1', period }))).toMatchInlineSnapshot(
      `PREWHERE target = 't1' AND timestamp >= toDateTime('2024-01-01 00:00:00', 'UTC') AND timestamp <= toDateTime('2024-01-02 00:00:00', 'UTC')`,
    );
  });

  test('operations (include)', () => {
    expect(
      render(reader.createFilter({ target: 't1', operations: ['h1', 'h2'] })),
    ).toMatchInlineSnapshot(`PREWHERE target = 't1' AND (hash) IN (['h1', 'h2'])`);
  });

  test('operations (exclude)', () => {
    expect(
      render(reader.createFilter({ target: 't1', operations: ['h1'], excludeOperations: true })),
    ).toMatchInlineSnapshot(`PREWHERE target = 't1' AND (hash) NOT IN (['h1'])`);
  });

  test('clients (plain array)', () => {
    expect(
      render(reader.createFilter({ target: 't1', clients: ['web', 'mobile'] })),
    ).toMatchInlineSnapshot(`PREWHERE target = 't1' AND client_name IN (['web', 'mobile'])`);
  });

  test('clientVersionFilters — single, no versions (all versions of client)', () => {
    expect(
      render(
        reader.createFilter({
          target: 't1',
          clientVersionFilters: [{ clientName: 'web', versions: null }],
        }),
      ),
    ).toMatchInlineSnapshot(`PREWHERE target = 't1' AND ((client_name = 'web'))`);
  });

  test('clientVersionFilters — single, with versions', () => {
    expect(
      render(
        reader.createFilter({
          target: 't1',
          clientVersionFilters: [{ clientName: 'web', versions: ['1.0', '2.0'] }],
        }),
      ),
    ).toMatchInlineSnapshot(
      `PREWHERE target = 't1' AND ((client_name = 'web' AND client_version IN (['1.0', '2.0'])))`,
    );
  });

  test('clientVersionFilters — multiple (OR)', () => {
    expect(
      render(
        reader.createFilter({
          target: 't1',
          clientVersionFilters: [
            { clientName: 'web', versions: ['1.0'] },
            { clientName: 'mobile', versions: null },
          ],
        }),
      ),
    ).toMatchInlineSnapshot(
      `PREWHERE target = 't1' AND ((client_name = 'web' AND client_version IN (['1.0'])) OR (client_name = 'mobile'))`,
    );
  });

  test('clientVersionFilters — exclude (NOT-wrapped)', () => {
    expect(
      render(
        reader.createFilter({
          target: 't1',
          clientVersionFilters: [{ clientName: 'web', versions: ['1.0'] }],
          excludeClientVersionFilters: true,
        }),
      ),
    ).toMatchInlineSnapshot(
      `PREWHERE target = 't1' AND NOT ((client_name = 'web' AND client_version IN (['1.0'])))`,
    );
  });

  test(`clientVersionFilters — 'unknown' client maps to empty string`, () => {
    expect(
      render(
        reader.createFilter({
          target: 't1',
          clientVersionFilters: [{ clientName: 'unknown', versions: null }],
        }),
      ),
    ).toMatchInlineSnapshot(`PREWHERE target = 't1' AND ((client_name = ''))`);
  });

  test('full combo (target + period + operations + clients + clientVersionFilters + excludes)', () => {
    const filter = reader.createFilter({
      target: 't1',
      period,
      operations: ['h1'],
      clients: ['web'],
      clientVersionFilters: [{ clientName: 'web', versions: ['1.0'] }],
      excludeOperations: false,
      excludeClientVersionFilters: false,
    });
    expect(render(filter)).toMatchInlineSnapshot(
      `PREWHERE target = 't1' AND timestamp >= toDateTime('2024-01-01 00:00:00', 'UTC') AND timestamp <= toDateTime('2024-01-02 00:00:00', 'UTC') AND (hash) IN (['h1']) AND client_name IN (['web']) AND ((client_name = 'web' AND client_version IN (['1.0'])))`,
    );
    // values are bound (not interpolated) — pin the bound-value array too
    expect(filter.values).toMatchInlineSnapshot(`
      [
        t1,
        2024-01-01 00:00:00,
        2024-01-02 00:00:00,
        [
          h1,
        ],
        [
          web,
        ],
        web,
        [
          1.0,
        ],
      ]
    `);
  });

  test('namespace prefixes columns (as callers pass it: target/period/extra, no clients)', () => {
    expect(
      render(
        reader.createFilter({
          target: 't1',
          period,
          extra: [sqlExtra('cl')],
          namespace: 'cl',
        }),
      ),
    ).toMatchInlineSnapshot(
      `PREWHERE cl.target = 't1' AND cl.timestamp >= toDateTime('2024-01-01 00:00:00', 'UTC') AND cl.timestamp <= toDateTime('2024-01-02 00:00:00', 'UTC') AND cl.coordinate IN (['Query.foo'])`,
    );
  });

  test('skipWhere omits the PREWHERE keyword', () => {
    expect(
      render(reader.createFilter({ target: 't1', operations: ['h1'], skipWhere: true })),
    ).toMatchInlineSnapshot(`target = 't1' AND (hash) IN (['h1'])`);
  });
});

// A small `extra` SqlValue built from the same tag createFilter uses, so the
// namespace case mirrors a realistic caller (e.g. a coordinate predicate).
function sqlExtra(ns: string): SqlValue {
  return sql`${sql.raw(ns + '.')}coordinate IN (${sql.array(['Query.foo'], 'String')})`;
}
