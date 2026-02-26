import type { DatabasePool } from 'slonik';
import type { Logger } from '@graphql-hive/logger';
import type { HivePubSub } from '@hive/pubsub';
import type { EmailProvider } from './lib/emails/providers.js';
import type { SchemaProvider } from './lib/schema/provider.js';
import type { RequestBroker } from './lib/webhooks/send-webhook.js';

export type Context = {
  logger: Logger;
  email: EmailProvider;
  schema: SchemaProvider;
  pg: DatabasePool;
  requestBroker: RequestBroker | null;
  pubSub: HivePubSub;
};
