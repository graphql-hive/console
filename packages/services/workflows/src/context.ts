import type { Logger } from '@graphql-hive/logger';
import type { EmailProvider } from './lib/emails/providers';

export type Context = {
  logger: Logger;
  email: EmailProvider;
};
