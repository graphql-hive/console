import { describe, expect, it } from 'vitest';
import { parseClickHouseConfigFromEnvironment } from './clickhouse-config';

describe('parseClickHouseConfigFromEnvironment', () => {
  it('normalizes the ClickHouse config', () => {
    const result = parseClickHouseConfigFromEnvironment({
      CLICKHOUSE_PROTOCOL: 'https',
      CLICKHOUSE_HOST: 'clickhouse.example.com',
      CLICKHOUSE_PORT: '8443',
      CLICKHOUSE_USERNAME: 'default',
      CLICKHOUSE_PASSWORD: 'secret',
    });

    expect(result).toEqual({
      type: 'ok',
      config: {
        protocol: 'https',
        host: 'clickhouse.example.com',
        database: 'default',
        port: 8443,
        username: 'default',
        password: 'secret',
      },
    });
  });

  it('accepts a custom database', () => {
    const result = parseClickHouseConfigFromEnvironment({
      CLICKHOUSE_PROTOCOL: 'http',
      CLICKHOUSE_HOST: 'localhost',
      CLICKHOUSE_DB: 'hive_usage',
      CLICKHOUSE_PORT: '8123',
      CLICKHOUSE_USERNAME: 'default',
      CLICKHOUSE_PASSWORD: '',
    });

    expect(result.type).toBe('ok');
    if (result.type === 'ok') expect(result.config.database).toBe('hive_usage');
  });

  it('rejects an invalid database identifier', () => {
    const result = parseClickHouseConfigFromEnvironment({
      CLICKHOUSE_PROTOCOL: 'http',
      CLICKHOUSE_HOST: 'localhost',
      CLICKHOUSE_DB: 'hive-usage',
      CLICKHOUSE_PORT: '8123',
      CLICKHOUSE_USERNAME: 'default',
      CLICKHOUSE_PASSWORD: '',
    });

    expect(result.type).toBe('error');
  });
});
