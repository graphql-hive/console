import { printWithValues } from '@hive/clickhouse';
import {
  buildTracesFilterValuesQuery,
  toValueList,
  TRACES_FILTER_VALUES_CAP,
  TracesFilterValuesLoader,
} from '../providers/traces';

const period = {
  from: new Date('2024-01-01T00:00:00.000Z'),
  to: new Date('2024-01-02T00:00:00.000Z'),
};

const squash = (text: string) => text.replace(/\s+/g, ' ').trim();

describe('buildTracesFilterValuesQuery', () => {
  test('filters by target and period only', () => {
    const query = squash(printWithValues(buildTracesFilterValuesQuery('t1', period, ['httpUrls'])));
    expect(query).toMatchInlineSnapshot(
      `SELECT 'd0' AS "key" , toString("http_url") AS "value" , count(*) AS "count" FROM "otel_traces_normalized" PREWHERE "target_id" = 't1' AND "timestamp" >= toDateTime('2024-01-01 00:00:00', 'UTC') AND "timestamp" <= toDateTime('2024-01-02 00:00:00', 'UTC') GROUP BY "value" HAVING "value" != '' ORDER BY "count" DESC, "value" ASC LIMIT 1001 SETTINGS max_threads = 8`,
    );
  });

  test('selects only the requested dimensions, tagged by request position', () => {
    const query = squash(
      printWithValues(
        buildTracesFilterValuesQuery('t1', period, ['subgraphNames', 'operationNames']),
      ),
    );
    expect(query).toContain(
      `SELECT 'd0' AS "key" , toString(arr_join_column_value) AS "value" , count(*) AS "count" FROM "otel_traces_normalized" ARRAY JOIN "subgraph_names" AS "arr_join_column_value"`,
    );
    expect(query).toContain(
      `UNION ALL SELECT 'd1' AS "key" , toString("graphql_operation_name") AS "value"`,
    );
    expect(query).not.toContain('client_name');
  });
});

describe('TracesFilterValuesLoader', () => {
  test('maps rows to dimensions by position, in one query', async () => {
    const query = vi.fn().mockResolvedValue({
      data: [
        { key: 'd0', value: 'GetUser', count: '5' },
        { key: 'd1', value: 'web', count: '2' },
        { key: 'd0', value: 'GetPost', count: '3' },
      ],
    });
    const loader = new TracesFilterValuesLoader({ query } as any, 't1', period);

    const [operations, clients] = await Promise.all([
      loader.load('operationNames'),
      loader.load('clientNames'),
    ]);

    expect(query).toHaveBeenCalledTimes(1);
    expect(operations).toEqual({ values: ['GetUser', 'GetPost'], truncated: false });
    expect(clients).toEqual({ values: ['web'], truncated: false });
  });

  test('orders each dimension by count, then value, whatever order the rows arrive in', async () => {
    const query = vi.fn().mockResolvedValue({
      data: [
        { key: 'd0', value: 'b', count: '1' },
        { key: 'd0', value: 'c', count: '9' },
        { key: 'd0', value: 'a', count: '1' },
      ],
    });
    const loader = new TracesFilterValuesLoader({ query } as any, 't1', period);
    expect((await loader.load('httpHosts')).values).toEqual(['c', 'a', 'b']);
  });

  test('answers an empty period with empty lists', async () => {
    const query = vi.fn().mockResolvedValue({ data: [] });
    const loader = new TracesFilterValuesLoader({ query } as any, 't1', period);
    expect(await loader.load('httpMethods')).toEqual({ values: [], truncated: false });
  });
});

describe('toValueList', () => {
  const values = (count: number) => Array.from({ length: count }, (_, i) => `v${i}`);

  test('keeps every value at exactly the cap, not truncated', () => {
    const list = toValueList(values(TRACES_FILTER_VALUES_CAP));
    expect(list.values).toHaveLength(TRACES_FILTER_VALUES_CAP);
    expect(list.truncated).toBe(false);
  });

  test('marks truncated when the value past the cap exists', () => {
    const list = toValueList(values(TRACES_FILTER_VALUES_CAP + 1));
    expect(list.values).toHaveLength(TRACES_FILTER_VALUES_CAP);
    expect(list.truncated).toBe(true);
  });
});
