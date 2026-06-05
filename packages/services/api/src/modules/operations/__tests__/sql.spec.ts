import { printWithValues, sql, toQueryParams } from '../providers/sql';

test('printWithValues', () => {
  expect(
    printWithValues(
      sql`SELECT * FROM table WHERE id = ${'id1'} AND timestamp > ${'date1'} AND target IN (${sql.array(
        ['target1', 'target2'],
        'String',
      )})`,
    ),
  ).toBe(
    `SELECT * FROM table WHERE id = 'id1' AND timestamp > 'date1' AND target IN (['target1', 'target2'])`,
  );
});

describe('sql.longArray', () => {
  test('values not exceeding the limit result in single parameter', () => {
    const firstValue = new Array(5_000 - 5).fill('a').join('');
    const secondValue = new Array(5_000 - 5).fill('b').join('');
    const query = sql`${sql.longArray([firstValue, secondValue], 'String')}`;
    expect(query.sql).toEqual(`{p1: Array(String)}`);
    expect(printWithValues(query).replace(firstValue, 'a').replace(secondValue, 'b')).toEqual(
      `['a', 'b']`,
    );
  });
  test('values with one exceeding the limit result in two parameters that are concatenated', () => {
    const firstValue = new Array(5_000).fill('a').join('');
    const secondValue = new Array(5_000).fill('b').join('');
    const query = sql`${sql.longArray([firstValue, secondValue], 'String')}`;
    expect(query.sql).toEqual(`arrayConcat({p1: Array(String)}, {p2: Array(String)})`);

    expect(printWithValues(query).replace(firstValue, 'a').replace(secondValue, 'b')).toEqual(
      `arrayConcat(['a'], ['b'])`,
    );
  });
});

describe('toQueryParams', () => {
  test('scalar string values map to 1-indexed param_pN', () => {
    const query = sql`id = ${'id1'} AND name = ${'web'}`;
    expect(toQueryParams(query)).toEqual({
      param_p1: 'id1',
      param_p2: 'web',
    });
  });

  test('array values (sql.array) serialize as a single bracketed param', () => {
    const query = sql`hash IN (${sql.array(['a', 'b'], 'String')})`;
    expect(toQueryParams(query)).toEqual({
      param_p1: `['a', 'b']`,
    });
  });

  test('double quotes in a value are escaped', () => {
    const query = sql`name = ${'a"b'}`;
    expect(toQueryParams(query)).toEqual({
      param_p1: 'a\\"b',
    });
  });

  test('mixed scalar + array preserve position', () => {
    const query = sql`a = ${'x'} AND b IN (${sql.array(['p', 'q'], 'String')}) AND c = ${'y'}`;
    expect(toQueryParams(query)).toEqual({
      param_p1: 'x',
      param_p2: `['p', 'q']`,
      param_p3: 'y',
    });
  });
});

describe('parameter renumbering', () => {
  test('sql.join renumbers each fragment sequentially', () => {
    const frag1 = sql`a = ${'1'}`;
    const frag2 = sql`b = ${'2'}`;
    const joined = sql`WHERE ${sql.join([frag1, frag2], ' AND ')}`;

    expect(joined.sql).toMatchInlineSnapshot(`WHERE a = {p1: String} AND b = {p2: String}`);
    expect(joined.values).toEqual(['1', '2']);
    expect(printWithValues(joined)).toBe(`WHERE a = '1' AND b = '2'`);
  });

  test('a fragment embedded after a scalar shifts its inner placeholders', () => {
    const inner = sql`x IN (${sql.array(['a'], 'String')})`;
    const outer = sql`${'before'} AND ${inner} AND ${'after'}`;

    expect(outer.sql).toMatchInlineSnapshot(
      `{p1: String} AND x IN ({p2: Array(String)}) AND {p3: String}`,
    );
    expect(outer.values).toEqual(['before', ['a'], 'after']);
    expect(printWithValues(outer)).toBe(`'before' AND x IN (['a']) AND 'after'`);
  });

  test('deeply nested fragments keep contiguous ascending positions', () => {
    const inner = sql`c = ${'3'}`;
    const mid = sql`b = ${'2'} AND ${inner}`;
    const outer = sql`a = ${'1'} AND ${mid} AND d = ${'4'}`;

    expect(outer.sql).toMatchInlineSnapshot(
      `a = {p1: String} AND b = {p2: String} AND c = {p3: String} AND d = {p4: String}`,
    );
    expect(outer.values).toEqual(['1', '2', '3', '4']);
    expect(printWithValues(outer)).toBe(`a = '1' AND b = '2' AND c = '3' AND d = '4'`);
  });
});
