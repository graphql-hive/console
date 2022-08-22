import type { RawOperation } from './raw';

export type ProcessedReport = ProcessedOperation[];

export interface ProcessedOperation {
  target: string;
  operationHash: string;
  timestamp: number;
  expiresAt: number;
  execution: RawOperation['execution'];
  metadata?: RawOperation['metadata'];
}

export interface ProcessedRegistryRecord {
  size: number;
  target: string;
  hash: string;
  name?: string | null;
  body: string;
  operation_kind: string;
  inserted_at: number;
  expires_at: number;
  coordinates: string[];
}
