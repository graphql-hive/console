import { buildOperationsFilterSQLConditions } from './operations-filter';
import { printWithValues, type SqlValue } from './sql';

const render = (conds: SqlValue[]) => conds.map(c => printWithValues(c));

describe('buildOperationsFilterSQLConditions', () => {
  test('empty input -> no conditions', () => {
    expect(buildOperationsFilterSQLConditions({})).toEqual([]);
  });

  test('operations (include)', () => {
    expect(render(buildOperationsFilterSQLConditions({ operations: ['h1', 'h2'] }))).toEqual([
      `(hash) IN (['h1', 'h2'])`,
    ]);
  });

  test('operations (exclude)', () => {
    expect(
      render(buildOperationsFilterSQLConditions({ operations: ['h1'], excludeOperations: true })),
    ).toEqual([`(hash) NOT IN (['h1'])`]);
  });

  test('clients (plain array)', () => {
    expect(render(buildOperationsFilterSQLConditions({ clients: ['web', 'mobile'] }))).toEqual([
      `client_name IN (['web', 'mobile'])`,
    ]);
  });

  test('clientVersionFilters — single, no versions', () => {
    expect(
      render(
        buildOperationsFilterSQLConditions({
          clientVersionFilters: [{ clientName: 'web', versions: null }],
        }),
      ),
    ).toEqual([`((client_name = 'web'))`]);
  });

  test('clientVersionFilters — single, with versions', () => {
    expect(
      render(
        buildOperationsFilterSQLConditions({
          clientVersionFilters: [{ clientName: 'web', versions: ['1.0', '2.0'] }],
        }),
      ),
    ).toEqual([`((client_name = 'web' AND client_version IN (['1.0', '2.0'])))`]);
  });

  test('clientVersionFilters — multiple (OR)', () => {
    expect(
      render(
        buildOperationsFilterSQLConditions({
          clientVersionFilters: [
            { clientName: 'web', versions: ['1.0'] },
            { clientName: 'mobile', versions: null },
          ],
        }),
      ),
    ).toEqual([
      `((client_name = 'web' AND client_version IN (['1.0'])) OR (client_name = 'mobile'))`,
    ]);
  });

  test('clientVersionFilters — exclude (NOT-wrapped)', () => {
    expect(
      render(
        buildOperationsFilterSQLConditions({
          clientVersionFilters: [{ clientName: 'web', versions: ['1.0'] }],
          excludeClientVersionFilters: true,
        }),
      ),
    ).toEqual([`NOT ((client_name = 'web' AND client_version IN (['1.0'])))`]);
  });

  test(`clientVersionFilters — 'unknown' maps to empty string`, () => {
    expect(
      render(
        buildOperationsFilterSQLConditions({
          clientVersionFilters: [{ clientName: 'unknown', versions: null }],
        }),
      ),
    ).toEqual([`((client_name = ''))`]);
  });

  test('combined conditions keep order: operations, clients, clientVersionFilters', () => {
    expect(
      render(
        buildOperationsFilterSQLConditions({
          operations: ['h1'],
          clients: ['web'],
          clientVersionFilters: [{ clientName: 'web', versions: ['1.0'] }],
        }),
      ),
    ).toEqual([
      `(hash) IN (['h1'])`,
      `client_name IN (['web'])`,
      `((client_name = 'web' AND client_version IN (['1.0'])))`,
    ]);
  });

  describe('namespace prefixing', () => {
    test('all branches prefixed with `${ns}.`', () => {
      expect(
        render(
          buildOperationsFilterSQLConditions({
            operations: ['h1'],
            clients: ['web'],
            clientVersionFilters: [{ clientName: 'web', versions: ['1.0'] }],
            namespace: 'cl',
          }),
        ),
      ).toEqual([
        `(cl.hash) IN (['h1'])`,
        `cl.client_name IN (['web'])`,
        `((cl.client_name = 'web' AND cl.client_version IN (['1.0'])))`,
      ]);
    });

    test('regression: namespace + clients yields `ns.client_name`, not `nsclient_name`', () => {
      const [cond] = buildOperationsFilterSQLConditions({ clients: ['web'], namespace: 'cl' });
      expect(printWithValues(cond)).toBe(`cl.client_name IN (['web'])`);
      expect(cond.sql).not.toContain('clclient_name');
    });
  });

  // Arbitrary string values are bound params, never interpolated into the SQL.
  describe('injection safety (bound params)', () => {
    test('malicious client name (version filter) lands in values, not sql', () => {
      const evil = `x'); DROP TABLE operations; --`;
      const [cond] = buildOperationsFilterSQLConditions({
        clientVersionFilters: [{ clientName: evil, versions: null }],
      });
      expect(cond.sql).not.toContain('DROP TABLE');
      expect(cond.sql).toContain('{p1: String}');
      expect(cond.values).toContain(evil);
    });

    test('malicious client name (plain clients) lands in values, not sql', () => {
      const evil = `web' OR '1'='1`;
      const [cond] = buildOperationsFilterSQLConditions({ clients: [evil] });
      expect(cond.sql).not.toContain('OR ');
      expect(cond.sql).toContain('{p1: Array(String)}');
      expect(cond.values).toEqual([[evil]]);
    });
  });
});
