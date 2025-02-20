import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { BillingProvider } from './providers/billing.provider';
import { provideCommerceClient } from './providers/commerce-client';
import { RateLimitProvider } from './providers/rate-limit.provider';
import { UsageEstimationProvider } from './providers/usage-estimation.provider';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const commerceModule = createModule({
  id: 'commerce',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [
    BillingProvider,
    RateLimitProvider,
    UsageEstimationProvider,
    AuditLogManager,
    provideCommerceClient(),
  ],
});
