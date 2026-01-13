import { clickHouseQuery } from '../../testkit/clickhouse';
import { ensureEnv } from '../../testkit/env';
import { getServiceHost } from '../../testkit/utils';

test('update-retention script applies TTL to ClickHouse tables', async () => {
  const originalEnv = { ...process.env };

  try {
    // Set up ClickHouse connection env vars for migrations module
    const clickhouseAddress = await getServiceHost('clickhouse', 8123);
    const [host, port] = clickhouseAddress.split(':');
    process.env.CLICKHOUSE_PROTOCOL = 'http';
    process.env.CLICKHOUSE_HOST = host;
    process.env.CLICKHOUSE_PORT = port;
    process.env.CLICKHOUSE_USERNAME = ensureEnv('CLICKHOUSE_USER');
    process.env.CLICKHOUSE_PASSWORD = ensureEnv('CLICKHOUSE_PASSWORD');

    // Set retention TTL values
    process.env.CLICKHOUSE_TTL_TABLES = '1 YEAR';
    process.env.CLICKHOUSE_TTL_DAILY_MV_TABLES = '30 DAY';
    process.env.CLICKHOUSE_TTL_HOURLY_MV_TABLES = '7 DAY';
    process.env.CLICKHOUSE_TTL_MINUTELY_MV_TABLES = '1 DAY';

    // Dynamic import to pick up env vars
    const { updateRetention } = await import(
      '../../../packages/migrations/src/scripts/update-retention'
    );

    await updateRetention();

    // Verify TTL was applied to a MergeTree table
    const operationsTable = await clickHouseQuery<{ engine_full: string }>(`
      SELECT engine_full
      FROM system.tables
      WHERE database = 'default' AND name = 'operations'
      LIMIT 1
    `);

    expect(operationsTable.rows).toBe(1);
    expect(operationsTable.data[0].engine_full).toContain('TTL');
    expect(operationsTable.data[0].engine_full).toContain('toIntervalYear(1)');

    // Verify TTL was applied to a daily materialized view inner table
    const operationsDailyTable = await clickHouseQuery<{ uuid: string }>(`
      SELECT uuid
      FROM system.tables
      WHERE database = 'default' AND name = 'operations_daily'
      LIMIT 1
    `);

    expect(operationsDailyTable.rows).toBe(1);
    const innerTableName = `.inner_id.${operationsDailyTable.data[0].uuid}`;
    const innerTable = await clickHouseQuery<{ engine_full: string }>(`
      SELECT engine_full
      FROM system.tables
      WHERE database = 'default' AND name = '${innerTableName}'
      LIMIT 1
    `);

    expect(innerTable.rows).toBe(1);
    expect(innerTable.data[0].engine_full).toContain('TTL');
    expect(innerTable.data[0].engine_full).toContain('toIntervalDay(30)');
  } finally {
    process.env = originalEnv;
  }
});

test('update-retention script skips gracefully when no env vars are set', async () => {
  const originalEnv = { ...process.env };

  try {
    delete process.env.CLICKHOUSE_TTL_TABLES;
    delete process.env.CLICKHOUSE_TTL_DAILY_MV_TABLES;
    delete process.env.CLICKHOUSE_TTL_HOURLY_MV_TABLES;
    delete process.env.CLICKHOUSE_TTL_MINUTELY_MV_TABLES;

    vi.resetModules();
    const { updateRetention } = await import(
      '../../../packages/migrations/src/scripts/update-retention'
    );

    // Should not throw
    await expect(updateRetention()).resolves.toBeUndefined();
  } finally {
    process.env = originalEnv;
  }
});
