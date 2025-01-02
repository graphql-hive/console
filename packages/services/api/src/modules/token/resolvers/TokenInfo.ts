import { OrganizationManager } from '../../organization/providers/organization-manager';
import { ProjectManager } from '../../project/providers/project-manager';
import { TargetManager } from '../../target/providers/target-manager';
import type { TokenInfoResolvers } from './../../../__generated__/types';

export const TokenInfo: TokenInfoResolvers = {
  __isTypeOf(token) {
    return 'token' in token;
  },
  token(token) {
    return token;
  },
  organization(token, _, { injector }) {
    return injector.get(OrganizationManager).getOrganization({
      organizationId: token.organization,
    });
  },
  project(token, _, { injector }) {
    return injector.get(ProjectManager).getProject({
      organizationId: token.organization,
      projectId: token.project,
    });
  },
  target(token, _, { injector }) {
    return injector.get(TargetManager).getTarget({
      organizationId: token.organization,
      projectId: token.project,
      targetId: token.target,
    });
  },
  hasOrganizationScope(token, { scope }) {
    return token.scopes.includes(scope);
  },
  hasProjectScope(token, { scope }) {
    return token.scopes.includes(scope);
  },
  hasTargetScope(token, { scope }) {
    return token.scopes.includes(scope);
  },
};
