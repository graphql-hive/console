import got from 'got';
import { z } from 'zod';
import type { Logger } from '@graphql-hive/logger';
import { SpanKind, SpanStatusCode, trace } from '@hive/service-common';

// Validate the response envelope only. Row-level shape is the caller's concern
// (e.g. queryClickHouseWindows parses `data` with its own Zod schema), so the
// generic `query<T>` just guarantees `data` is an array before handing it back.
const ClickHouseResponseSchema = z.object({
  data: z.array(z.unknown()),
  rows: z.number().optional(),
});

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
  async query<T extends Record<string, unknown>>(
    sql: string,
    queryId = 'query',
    // ClickHouse server-side bound parameters (`param_<name>`), referenced in the
    // SQL as `{name:Type}`. Use `toQueryParams()` from `@hive/clickhouse` to build
    // these from a `sql` statement so arbitrary string values are never interpolated.
    params?: Record<string, string>,
  ): Promise<T[]> {
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
          output_format_json_quote_64bit_integers: '1',
          ...params,
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

      const result = ClickHouseResponseSchema.parse(JSON.parse(response.body));
      span.setAttribute('db.response.rows', result.rows ?? result.data.length);
      return result.data as T[];
    } catch (error) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: 'clickhouse query failed' });
      span.setAttribute('error.type', error instanceof Error ? error.name : 'unknown');
      throw error;
    } finally {
      span.end();
    }
  }
}
