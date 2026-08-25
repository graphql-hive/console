import { InjectionToken } from 'graphql-modules';

export interface ClickHouseConfig {
  host: string;
  port: number;
  protocol?: string;
  username?: string;
  password?: string;
  /**
   * In milliseconds
   */
  requestTimeout?: number;
  /**
   * Earliest timestamp for which the t-digest operation rollups contain data.
   */
  tdigestRollupsStart?: Date;
  onReadEnd?: (
    label: string,
    timings: {
      totalSeconds: number;
      elapsedSeconds?: number;
    },
  ) => void;
}

export const CLICKHOUSE_CONFIG = new InjectionToken<ClickHouseConfig>('clickhouse-config');
