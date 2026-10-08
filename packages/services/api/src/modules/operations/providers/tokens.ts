import { InjectionToken } from 'graphql-modules';
import type { ClickHouseConfig as BaseClickHouseConfig } from '@hive/service-common';

export type ClickHouseConfig = BaseClickHouseConfig & {
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
};

export const CLICKHOUSE_CONFIG = new InjectionToken<ClickHouseConfig>('clickhouse-config');
