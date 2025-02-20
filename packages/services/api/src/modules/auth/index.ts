import { createModule } from 'graphql-modules';
import { AuditLogManager } from '../audit-logs/providers/audit-logs-manager';
import { AuthManager } from './providers/auth-manager';
import { OrganizationAccess } from './providers/organization-access';
import { OrganizationAccessTokenValidationCache } from './providers/organization-access-token-validation-cache';
import { ProjectAccess } from './providers/project-access';
import { TargetAccess } from './providers/target-access';
import { UserManager } from './providers/user-manager';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const authModule = createModule({
  id: 'auth',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [
    AuthManager,
    UserManager,
    OrganizationAccess,
    ProjectAccess,
    TargetAccess,
    AuditLogManager,
    OrganizationAccessTokenValidationCache,
  ],
});
