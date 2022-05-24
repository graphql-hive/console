import type { ExecutionArgs } from 'graphql';
import type { AgentOptions } from './agent';
import type { SchemaReporter } from './reporting';
import type { OperationsStore } from './operations-store';

export interface HiveClient {
  info(): Promise<void>;
  reportSchema: SchemaReporter['report'];
  collectUsage(args: ExecutionArgs): CollectUsageCallback;
  operationsStore: OperationsStore;
  dispose(): Promise<void>;
}

export type AsyncIterableIteratorOrValue<T> = AsyncIterableIterator<T> | T;

export type CollectUsageCallback = (result: AsyncIterableIteratorOrValue<GraphQLErrorsResult>) => void;
export interface ClientInfo {
  name: string;
  version: string;
}

export interface Logger {
  info(msg: string): void;
  error(error: any, ...data: any[]): void;
}

export interface HiveUsagePluginOptions {
  /**
   * Custom endpoint to collect schema usage
   *
   * Points to Hive by default
   */
  endpoint?: string;
  /**
   * Extract client info from GraphQL Context
   */
  clientInfo?(context: any): null | undefined | ClientInfo;
  /**
   * Generate hash of an operation (useful for persisted operations)
   */
  operationHash?(args: ExecutionArgs): string | null | undefined;
  /**
   * Hive uses LRU cache to store info about operations.
   * This option represents the maximum size of the cache.
   *
   * Default: 1000
   */
  max?: number;
  /**
   * Hive uses LRU cache to store info about operations.
   * This option represents the time-to-live of every cached operation.
   *
   * Default: no ttl
   */
  ttl?: number;
  /**
   * A list of operations (by name) to be ignored by Hive.
   */
  exclude?: string[];
  /**
   * Sample rate to determine sampling.
   * 0.0 = 0% chance of being sent
   * 1.0 = 100% chance of being sent.
   *
   * Default: 1.0
   */
  sampleRate?: number;
}

export interface HiveReportingPluginOptions {
  /**
   * Custom endpoint to collect schema reports
   *
   * Points to Hive by default
   */
  endpoint?: string;
  /**
   * Author of current version of the schema
   */
  author: string;
  /**
   * Commit SHA hash (or any identifier) related to the schema version
   */
  commit: string;
  /**
   * URL to the service (use only for distributed schemas)
   */
  serviceUrl?: string;
  /**
   * Name of the service (use only for distributed schemas)
   */
  serviceName?: string;
}

export interface HiveOperationsStorePluginOptions {
  /**
   * Custom endpoint to fetch stored operations
   *
   * Points to Hive by default
   */
  endpoint?: string;
}

export interface HivePluginOptions {
  /**
   * Enable/Disable Hive
   *
   * Default: true
   */
  enabled?: boolean;
  /**
   * Debugging mode
   *
   * Default: false
   */
  debug?: boolean;
  /**
   * Access Token
   */
  token: string;
  agent?: Omit<AgentOptions, 'endpoint' | 'token' | 'enabled' | 'debug'>;
  /**
   * Collects schema usage based on operations
   *
   * Disabled by default
   */
  usage?: HiveUsagePluginOptions | boolean;
  /**
   * Schema reporting
   *
   * Disabled by default
   */
  reporting?: HiveReportingPluginOptions | false;
  /**
   * Operations Store
   */
  operationsStore?: HiveOperationsStorePluginOptions;
}

export type Maybe<T> = null | undefined | T;

export interface GraphQLErrorsResult {
  errors?: ReadonlyArray<{
    message: string;
    path?: Maybe<ReadonlyArray<string | number>>;
  }>;
}

export interface SupergraphSDLFetcherOptions {
  endpoint: string;
  key: string;
}

export interface SchemaFetcherOptions {
  endpoint: string;
  key: string;
}

export interface ServicesFetcherOptions {
  endpoint: string;
  key: string;
}
