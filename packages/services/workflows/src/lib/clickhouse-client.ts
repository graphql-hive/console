import got from 'got';
import type { Logger } from '@graphql-hive/logger';

export type ClickHouseConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  protocol?: string;
};

export class ClickHouseClient {
  private baseUrl: string;

  constructor(
    private config: ClickHouseConfig,
    private logger: Logger,
  ) {
    const protocol = config.protocol ?? 'http';
    this.baseUrl = `${protocol}://${config.host}:${config.port}`;
  }

  async query<T extends Record<string, unknown>>(sql: string): Promise<T[]> {
    this.logger.debug('Executing ClickHouse query');

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

    const result = JSON.parse(response.body) as { data: T[] };
    return result.data;
  }
}
