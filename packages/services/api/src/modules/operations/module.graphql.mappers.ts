import type Dataloader from 'dataloader';
import type { ClientStatsValues, OperationStatsValues, PageInfo } from '../../__generated__/types';
import type { DateRange } from '../../shared/entities';
import { Span, Trace } from './providers/traces';

// import { SqlValue } from './providers/sql';

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

export type TracesFilterOptionsMapper = {
  // ANDs: readonly SqlValue[];
  loader: Dataloader<
    {
      key: string;
      columnExpression: string;
      limit: number | null;
      arrayJoinColumn: string | null;
    },
    { value: string; count: number }[],
    string
  >;
};

export type TraceMapper = Trace;
export type SpanMapper = Span;
