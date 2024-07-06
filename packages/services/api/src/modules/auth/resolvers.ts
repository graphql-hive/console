import { createConnection } from '../../shared/schema';
import { AuthModule } from './__generated__/types';
import { AuthManager } from './providers/auth-manager';
import { ProjectAccessScope } from './providers/project-access';
import { TargetAccessScope } from './providers/target-access';

export const resolvers: AuthModule.Resolvers & {
  ProjectAccessScope: {
    [K in AuthModule.ProjectAccessScope]: ProjectAccessScope;
  };
  TargetAccessScope: {
    [K in AuthModule.TargetAccessScope]: TargetAccessScope;
  };
} = {
  ProjectAccessScope: {
    READ: ProjectAccessScope.READ,
    DELETE: ProjectAccessScope.DELETE,
    ALERTS: ProjectAccessScope.ALERTS,
    SETTINGS: ProjectAccessScope.SETTINGS,
    OPERATIONS_STORE_READ: ProjectAccessScope.OPERATIONS_STORE_READ,
    OPERATIONS_STORE_WRITE: ProjectAccessScope.OPERATIONS_STORE_WRITE,
  },
  TargetAccessScope: {
    READ: TargetAccessScope.READ,
    REGISTRY_READ: TargetAccessScope.REGISTRY_READ,
    REGISTRY_WRITE: TargetAccessScope.REGISTRY_WRITE,
    DELETE: TargetAccessScope.DELETE,
    SETTINGS: TargetAccessScope.SETTINGS,
    TOKENS_READ: TargetAccessScope.TOKENS_READ,
    TOKENS_WRITE: TargetAccessScope.TOKENS_WRITE,
  },
  Member: {
    organizationAccessScopes(member, _, { injector }) {
      return injector.get(AuthManager).getMemberOrganizationScopes({
        user: member.user.id,
        organization: member.organization,
      });
    },
    projectAccessScopes(member, _, { injector }) {
      return injector.get(AuthManager).getMemberProjectScopes({
        user: member.user.id,
        organization: member.organization,
      });
    },
    targetAccessScopes(member, _, { injector }) {
      return injector.get(AuthManager).getMemberTargetScopes({
        user: member.user.id,
        organization: member.organization,
      });
    },
  },
  UserConnection: createConnection(),
  MemberConnection: createConnection(),
};
