import type { ClientStatsValues, OperationStatsValues, PageInfo } from '../../__generated__/types';
import type { DateRange } from '../../shared/entities';

type Connection<TNode> = {
  pageInfo: PageInfo;
  edges: Array<{ node: TNode; cursor: string }>;
};

export type OperationStatsValuesConnectionMapper = Connection<
  Omit<OperationStatsValues, 'duration'> & { duration: DurationValuesMapper }
>;

export type ClientStatsValuesConnectionMapper = Connection<ClientStatsValues>;

export interface SchemaCoordinateStatsMapper {
  organization: string;
  project: string;
  target: string;
  period: DateRange;
  schemaCoordinate: string;
}
export interface ClientStatsMapper {
  organization: string;
  project: string;
  target: string;
  period: DateRange;
  clientName: string;
}
export interface OperationsStatsMapper {
  organization: string;
  project: string;
  target: string;
  period: DateRange;
  operations: readonly string[];
  clients: readonly string[];
}
export interface DurationValuesMapper {
  avg: number | null;
  p75: number | null;
  p90: number | null;
  p95: number | null;
  p99: number | null;
}
