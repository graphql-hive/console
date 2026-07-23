import type { RawOperation } from './raw';

export type ProcessedReport = ProcessedOperation[];

export interface ProcessedOperation {
  target: string;
  organization: string;
  operationHash: string;
  timestamp: number;
  expiresAt: number;
  execution: RawOperation['execution'];
  metadata?: RawOperation['metadata'];
}

export interface ProcessedSubscriptionOperation {
  target: string;
  organization: string;
  operationHash: string;
  timestamp: number;
  expiresAt: number;
  metadata?: RawOperation['metadata'];
}

export interface ProcessedRegistryRecord {
  size: number;
  target: string;
  hash: string;
  name?: string | null;
  body: string;
  operation_kind: string;
  timestamp: number;
  expires_at: number;
  coordinates: string[];
}

export interface ProcessedAppDeploymentUsageRecord {
  target: string;
  appName: string;
  appVersion: string;
  lastRequestTimestamp: number;
}

export interface ProcessedOperationErrorRecord {
  target: string;
  hash: string;
  timestamp: number;
  expires_at: number;
  /** All errors associated with this operation call. If the code isn't defined, use an empty string. */
  errors: [code: string, path: string][];
}
