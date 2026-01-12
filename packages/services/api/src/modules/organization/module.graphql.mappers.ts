import type {
  Organization,
  OrganizationGetStarted,
  OrganizationInvitation,
} from '../../shared/entities';
import type {
  GraphQLResolvedResourcePermissionGroupOutput,
  OrganizationAccessToken,
} from './providers/organization-access-tokens';
import type { OrganizationMemberRole } from './providers/organization-member-roles';
import type { OrganizationMembership } from './providers/organization-members';
import type {
  ProjectForResourceSelector,
  TargetForResourceSelector,
} from './providers/resource-selector';

export type OrganizationConnectionMapper = readonly Organization[];
export type OrganizationMapper = Organization;
export type MemberRoleMapper = OrganizationMemberRole;
export type OrganizationGetStartedMapper = OrganizationGetStarted;
export type OrganizationInvitationMapper = OrganizationInvitation;
export type MemberMapper = OrganizationMembership;
export type OrganizationAccessTokenMapper = OrganizationAccessToken;
export type PersonalAccessTokenMapper = OrganizationAccessToken;
export type ProjectAccessTokenMapper = OrganizationAccessToken;

export type WhoAmIMapper = {
  title: string;
  resolvedPermissions: (
    showAll: boolean,
  ) => Promise<Array<GraphQLResolvedResourcePermissionGroupOutput>>;
};

export type ProjectForResourceSelectorMapper = ProjectForResourceSelector;
export type TargetForResourceSelectorMapper = TargetForResourceSelector;
