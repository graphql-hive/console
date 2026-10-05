import { InjectionToken } from 'graphql-modules';

export interface ClickHouseConfig {
  host: string;
  port: number;
  protocol?: string;
  username?: string;
  password?: string;
  /**
   * The database tables are read from and written to (`CLICKHOUSE_DB`). Sent as the
   * `database` request setting, so queries use unqualified table names. Omitted, the
   * request carries no setting and ClickHouse falls back to the user's default.
   */
  database?: string;
  /**
   * In milliseconds
   */
  requestTimeout?: number;
  onReadEnd?: (
    label: string,
    timings: {
      totalSeconds: number;
      elapsedSeconds?: number;
    },
  ) => void;
}

export const CLICKHOUSE_CONFIG = new InjectionToken<ClickHouseConfig>('clickhouse-config');
