import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '../../shared/providers/http-client';
import { ClickHouse, sql } from './clickhouse-client';
import type { ClickHouseConfig } from './tokens';

const logger = {
  child: () => logger,
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
} as any;

function setup(database?: string) {
  const post = vi.fn().mockResolvedValue({ data: [], rows: 0, statistics: { elapsed: 0 } });
  const config: ClickHouseConfig = {
    protocol: 'http',
    host: 'localhost',
    port: 8123,
    username: 'test',
    password: 'test',
    database,
  };
  const clickhouse = new ClickHouse(config, { post } as unknown as HttpClient, logger);
  const searchParams = () => post.mock.calls[0][1].searchParams as Record<string, unknown>;
  return { clickhouse, searchParams };
}

// Queries name their tables unqualified, so the `database` request setting is the only thing
// that keeps a Hive instance on its own database when CLICKHOUSE_DB is set.
describe('ClickHouse database selection', () => {
  it('sends the configured database with a query', async () => {
    const { clickhouse, searchParams } = setup('hive');
    await clickhouse.query({ query: sql`SELECT 1`, queryId: 'test', timeout: 1000 });
    expect(searchParams().database).toBe('hive');
  });

  it('sends the configured database with a postQuery', async () => {
    const { clickhouse, searchParams } = setup('hive');
    await clickhouse.postQuery({ query: sql`SELECT 1`, queryId: 'test', timeout: 1000 });
    expect(searchParams().database).toBe('hive');
  });

  it('sends the configured database with an insert', async () => {
    const { clickhouse, searchParams } = setup('hive');
    await clickhouse.insert({
      query: sql`INSERT INTO audit_logs FORMAT CSV`,
      queryId: 'test',
      data: [[1]],
      timeout: 1000,
    });
    expect(searchParams().database).toBe('hive');
  });

  it('sends no database setting when none is configured', async () => {
    const { clickhouse, searchParams } = setup(undefined);
    await clickhouse.query({ query: sql`SELECT 1`, queryId: 'test', timeout: 1000 });
    expect(searchParams()).not.toHaveProperty('database');
  });

  it('keeps bound query values alongside the database setting', async () => {
    const { clickhouse, searchParams } = setup('hive');
    await clickhouse.query({
      query: sql`SELECT * FROM operations WHERE target = ${'abc'}`,
      queryId: 'test',
      timeout: 1000,
    });
    expect(searchParams()).toMatchObject({ database: 'hive', param_p1: 'abc' });
  });
});
