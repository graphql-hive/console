import { createModule } from 'graphql-modules';
import { OrganizationAccessTokens } from './providers/organization-access-tokens';
import { OrganizationAccessTokensCache } from './providers/organization-access-tokens-cache';
import { OrganizationManager } from './providers/organization-manager';
import { OrganizationMemberRoles } from './providers/organization-member-roles';
import { OrganizationMembers } from './providers/organization-members';
import { ResourceAssignments } from './providers/resource-assignments';
import { resolvers } from './resolvers.generated';
import typeDefs from './module.graphql';

export const organizationModule = createModule({
  id: 'organization',
  dirname: __dirname,
  typeDefs,
  resolvers,
  providers: [
    OrganizationMemberRoles,
    OrganizationMembers,
    OrganizationManager,
    OrganizationAccessTokens,
    ResourceAssignments,
    OrganizationAccessTokensCache,
  ],
});
