import got from 'got';
import type { Logger } from '@graphql-hive/logger';
import { SpanKind, SpanStatusCode, trace } from '@hive/service-common';

export type ClickHouseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  protocol?: string;
};

const tracer = trace.getTracer('clickhouse-client');

export class ClickHouseClient {
  private baseUrl: string;

  constructor(
    private config: ClickHouseConfig,
    private logger: Logger,
  ) {
    const protocol = config.protocol ?? 'http';
    this.baseUrl = `${protocol}://${config.host}:${config.port}`;
  }

  // `queryId` names the span (e.g. `ClickHouse: metric-alert-windows`) so the
  // round-trip is identifiable in the flame chart rather than an unattributed
  // gap. Because callers run inside an active span (e.g. `evaluate-group`),
  // startSpan parents this CLIENT span under it automatically...giving the
  // trace the per-query ClickHouse detail the API-side client already emits.
  async query<T extends Record<string, unknown>>(sql: string, queryId = 'query'): Promise<T[]> {
    const span = tracer.startSpan(`ClickHouse: ${queryId}`, {
      kind: SpanKind.CLIENT,
      attributes: {
        'db.type': 'ClickHouse',
        'db.query': sql,
        'db.query.id': queryId,
      },
    });
    this.logger.debug('Executing ClickHouse query');

    try {
      const response = await got.post(this.baseUrl, {
        searchParams: {
          database: 'default',
          default_format: 'JSON',
        },
        headers: {
          'Content-Type': 'text/plain',
        },
        username: this.config.username,
        password: this.config.password,
        body: sql,
        timeout: {
          request: 10_000,
        },
        retry: {
          limit: 3,
          methods: ['POST'],
          statusCodes: [502, 503, 504],
        },
      });

      const result = JSON.parse(response.body) as { data: T[]; rows?: number };
      span.setAttribute('db.response.rows', result.rows ?? result.data.length);
      return result.data;
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'clickhouse query failed' });
      span.setAttribute('error.type', error instanceof Error ? error.name : 'unknown');
      throw error;
    } finally {
      span.end();
    }
  }
}
