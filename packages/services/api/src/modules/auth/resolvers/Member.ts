import { AuthManager } from '../providers/auth-manager';
import type { MemberResolvers } from './../../../__generated__/types';

export const Member: Pick<
  MemberResolvers,
  | 'id'
  | 'isOwner'
  | 'organizationAccessScopes'
  | 'projectAccessScopes'
  | 'targetAccessScopes'
  | 'user'
  | '__isTypeOf'
> = {
  organizationAccessScopes: (member, _, { injector }) => {
    return injector.get(AuthManager).getMemberOrganizationScopes({
      userId: member.user.id,
      organizationId: member.organization,
    });
  },
  projectAccessScopes: (member, _, { injector }) => {
    return injector.get(AuthManager).getMemberProjectScopes({
      userId: member.user.id,
      organizationId: member.organization,
    });
  },
  targetAccessScopes: (member, _, { injector }) => {
    return injector.get(AuthManager).getMemberTargetScopes({
      userId: member.user.id,
      organizationId: member.organization,
    });
  },
};
