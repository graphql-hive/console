import { createModule } from 'graphql-modules';
import { OrganizationAccessTokens } from './providers/organization-access-tokens';
import { OrganizationAccessTokensCache } from './providers/organization-access-tokens-cache';
import { OrganizationManager } from './providers/organization-manager';
import { OrganizationMemberRoles } from './providers/organization-member-roles';
import { OrganizationMembers } from './providers/organization-members';
import { PersonalAccessTokens } from './providers/personal-access-tokens';
import { PersonalAccessTokensCache } from './providers/personal-access-tokens-cache';
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
    PersonalAccessTokens,
    ResourceAssignments,
    OrganizationAccessTokensCache,
    PersonalAccessTokensCache,
  ],
});
