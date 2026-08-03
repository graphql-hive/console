import type { Logger } from '@graphql-hive/logger';
import { PostgresDatabasePool } from '@hive/postgres';
import type { HivePubSub } from '@hive/pubsub';
import type { Encryptor, Redis } from '@hive/service-common';
import type { ClickHouseClient } from './lib/clickhouse-client.js';
import type { EmailProvider } from './lib/emails/providers.js';
import type { SchemaProvider } from './lib/schema/provider.js';
import type { RequestBroker } from './lib/webhooks/send-webhook.js';

export type Context = {
  logger: Logger;
  email: EmailProvider;
  schema: SchemaProvider;
  pg: PostgresDatabasePool;
  clickhouse: ClickHouseClient | null;
  requestBroker: RequestBroker | null;
  pubSub: HivePubSub;
  /** Hive Console base URL, no trailing slash. Null when unconfigured. */
  webAppUrl: string | null;
  /** Decrypts secrets written by the API service. Null when ENCRYPTION_SECRET is unset. */
  crypto: Encryptor | null;
  redis: Redis;
};
