import type { DatabasePool } from 'slonik';
import type { Logger } from '@graphql-hive/logger';
import type { HivePubSub } from '@hive/api/modules/shared/providers/pub-sub.js';
import type { EmailProvider } from './lib/emails/providers.js';
import { SchemaProvider } from './lib/schema/provider.js';
import { RequestBroker } from './lib/webhooks/send-webhook.js';

export type Context = {
  logger: Logger;
  email: EmailProvider;
  schema: SchemaProvider;
  pg: DatabasePool;
  requestBroker: RequestBroker | null;
  pubSub: HivePubSub;
};
