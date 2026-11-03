import type { Logger } from '@graphql-hive/logger';
import { PostgresDatabasePool } from '@hive/postgres';
import type { HivePubSub } from '@hive/pubsub';
import type { Encryptor, Redis } from '@hive/service-common';
import type { AlertChannelDeliveryRecorder } from './lib/alert-channel-delivery-recorder.js';
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
  /** Records alert-channel delivery attempts; a no-op when ClickHouse is not configured. */
  alertDeliveries: AlertChannelDeliveryRecorder;
  /** Hive release version, sent as the User-Agent of outbound webhook calls. */
  release: string;
  requestBroker: RequestBroker | null;
  pubSub: HivePubSub;
  /** Hive Console base URL, no trailing slash. Null when unconfigured. */
  webAppUrl: string | null;
  /** Decrypts secrets written by the API service. Null when ENCRYPTION_SECRET is unset. */
  crypto: Encryptor | null;
  /** Pinged after each successful metric alert evaluation tick. */
  metricAlertsHeartbeatEndpoint: string | null;
  redis: Redis;
};
