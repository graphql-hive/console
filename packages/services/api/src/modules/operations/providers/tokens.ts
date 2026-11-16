import { InjectionToken } from 'graphql-modules';
import type { ClickHouseConfig as BaseClickHouseConfig } from '@hive/service-common';

export type ClickHouseConfig = BaseClickHouseConfig & {
  /**
   * In milliseconds
   */
  requestTimeout?: number;
  /**
   * Earliest timestamp for which the graph-scoped (`*_by_graph_*`) rollups contain complete data.
   * Unset disables reading from them.
   */
  graphRollupsStart?: Date;
  onReadEnd?: (
    label: string,
    timings: {
      totalSeconds: number;
      elapsedSeconds?: number;
    },
  ) => void;
};

export const CLICKHOUSE_CONFIG = new InjectionToken<ClickHouseConfig>('clickhouse-config');
