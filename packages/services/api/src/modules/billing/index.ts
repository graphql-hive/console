import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { BillingProvider } from './providers/billing.provider';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const billingModule = createModule({
  id: 'billing',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [BillingProvider, AuditLogManager],
});
