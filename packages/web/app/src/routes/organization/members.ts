import { z } from 'zod';
import {
  OrganizationMembersGroupsSection,
  OrganizationMembersInvitationsSection,
  OrganizationMembersListSection,
  OrganizationMembersPage,
  OrganizationMembersRolesSection,
} from '@/pages/organization-members';
import { createRoute } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { organizationRoute } from './route';

export const organizationMembersRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/members',
  component: OrganizationMembersPage,
});

// The bare URL is the member list, which owns the search and SCIM filter params. `page` exists
// only to catch the old `?page=` form.
export const organizationMembersIndexRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: '/',
  validateSearch: zodValidator(
    z.object({
      page: legacySearch.organizationMembers.values.optional().catch(undefined),
      search: z.string().optional(),
      showPendingSCIMManagementConfirmations: z.boolean().optional(),
    }),
  ),
  beforeLoad: ({ search }) => legacySearchRedirect(legacySearch.organizationMembers, search),
  component: OrganizationMembersListSection,
});

export const organizationMembersRolesRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'roles',
  component: OrganizationMembersRolesSection,
});

export const organizationMembersGroupsRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'groups',
  component: OrganizationMembersGroupsSection,
});

export const organizationMembersInvitationsRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'invitations',
  component: OrganizationMembersInvitationsSection,
});
