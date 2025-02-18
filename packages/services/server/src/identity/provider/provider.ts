import type { FastifyInstance } from 'fastify';
import type { Context } from '../context';
import { StorageAdapter } from '../storage/storage';

export interface Provider<Properties = any> {
  type: string;
  init: (fastifyInstance: FastifyInstance, options: ProviderOptions<Properties>) => void;
  client?: (input: {
    clientID: string;
    clientSecret: string;
    params: Record<string, string>;
  }) => Promise<Properties>;
}

export interface ProviderOptions<$Properties> {
  name: string;
  success: (
    ctx: Context,
    properties: $Properties,
    opts?: {
      invalidate?: (subject: string) => Promise<void>;
    },
  ) => Promise<void>;
  cookie: {
    set<T>(ctx: Context, key: string, maxAge: number, value: T): Promise<void>;
    get<T>(ctx: Context, key: string): Promise<T>;
    unset(ctx: Context, key: string): void;
  };
  invalidate: (subject: string) => Promise<void>;
  storage: StorageAdapter;
}
export class ProviderError extends Error {}
export class ProviderUnknownError extends ProviderError {}
