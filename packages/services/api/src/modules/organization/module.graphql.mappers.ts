import type {
  Organization,
  OrganizationGetStarted,
  OrganizationInvitation,
} from '../../shared/entities';
import { OrganizationMemberRole } from './providers/organization-member-roles';
import { OrganizationMembership } from './providers/organization-members';

export type OrganizationConnectionMapper = readonly Organization[];
export type OrganizationMapper = Organization;
export type MemberRoleMapper = OrganizationMemberRole;
export type OrganizationGetStartedMapper = OrganizationGetStarted;
export type OrganizationInvitationMapper = OrganizationInvitation;
export type MemberConnectionMapper = readonly OrganizationMembership[];
export type MemberMapper = OrganizationMembership;
