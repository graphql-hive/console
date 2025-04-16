import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { AuthManager } from './providers/auth-manager';
import { OrganizationAccessTokenValidationCache } from './providers/organization-access-token-validation-cache';
import { UserManager } from './providers/user-manager';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const authModule = createModule({
  id: 'auth',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [AuthManager, UserManager, AuditLogManager, OrganizationAccessTokenValidationCache],
});
