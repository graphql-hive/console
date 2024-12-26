import { createServer } from 'http';
import { expect } from 'vitest';
import { HttpClient } from '../../shared/providers/http-client';
import { ClickHouse, sql } from './clickhouse-client';
import { ClickHouseConfig } from './tokens';

const PORT = 9999;
let requestCount = 0;

const server = createServer((_req, response) => {
  if (requestCount === 0 || requestCount === 1) {
    // First request: delay 10s then respond
    setTimeout(() => {
      response.end('HTTP/1.1 200 OK\r\n\r\n');
    }, 10000);
  } else if (requestCount === 2) {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.write(JSON.stringify({ data: 1 }));
    response.end();
  }

  requestCount++;
});

server.on('connection', socket => {
  console.log('connection, requestCount:', requestCount);

  if (requestCount === 1) {
    socket.pause();
    setTimeout(() => {
      socket.resume();
    }, 2000);
  }
});

describe('HttpClient', () => {
  beforeAll(() => {
    server.listen(PORT);
  });
  afterAll(() => {
    server.close();
  });

  // https://github.com/graphql-hive/console/issues/6220
  it('#6220: should not have unhandled exception in case of got timeout error', async () => {
    process.on('unhandledRejection', e => {
      console.error('unhandledRejection', e);
    });
    process.on('uncaughtException', e => {
      console.error('uncaughtException', e);
    });
    // const fakeServer =
    const httpClient = new HttpClient();
    const client = new ClickHouse(
      {
        host: 'localhost',
        port: PORT,
        protocol: 'http',
      } satisfies ClickHouseConfig,
      httpClient,
      // please stop annoying me
      { child: () => console, ...console } as any,
    );

    await expect(
      client.query({
        query: sql`SELECT 1`,
        queryId: 'test',
        timeout: 1000,
      }),
    ).rejects.toThrowError();
  });
});
