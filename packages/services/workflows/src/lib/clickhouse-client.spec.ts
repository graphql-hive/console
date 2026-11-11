import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { ClickHouseClient } from './clickhouse-client.js';
import { makeLogger } from './metric-alert-test-utils.js';

describe('ClickHouseClient.command', () => {
  let server: Server;
  let port: number;
  let requests: URLSearchParams[] = [];

  beforeAll(async () => {
    server = createServer((req, res) => {
      requests.push(new URL(req.url ?? '/', 'http://localhost').searchParams);
      res.writeHead(200).end();
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
  });

  beforeEach(() => {
    requests = [];
  });

  function createClient() {
    return new ClickHouseClient(
      {
        protocol: 'http',
        host: '127.0.0.1',
        port,
        database: 'test',
        username: 'test',
        password: 'test',
      },
      makeLogger().logger,
    );
  }

  test('writes synchronously', async () => {
    await expect(
      createClient().command('INSERT INTO t VALUES (1)', 'test'),
    ).resolves.toBeUndefined();

    expect(requests).toHaveLength(1);
    expect(requests[0].get('async_insert')).toBe('0');
    expect(requests[0].get('database')).toBe('test');
  });
});
