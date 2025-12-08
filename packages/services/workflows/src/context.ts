import type { DatabasePool } from 'slonik';
import type { Logger } from '@graphql-hive/logger';
import type { EmailProvider } from './lib/emails/providers';
import { RequestBroker } from './lib/webhooks/schema-change-notification';

export type Context = {
  logger: Logger;
  email: EmailProvider;
  pg: DatabasePool;
  requestBroker: RequestBroker | null;
};
