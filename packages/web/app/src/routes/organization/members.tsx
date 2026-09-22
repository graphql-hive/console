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
  component: function OrganizationMembersRoute() {
    const params = organizationMembersRoute.useParams();
    return <OrganizationMembersPage {...params} />;
  },
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
  component: function OrganizationMembersIndexRoute() {
    const params = organizationMembersIndexRoute.useParams();
    return <OrganizationMembersListSection {...params} />;
  },
});

export const organizationMembersRolesRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'roles',
  component: function OrganizationMembersRolesRoute() {
    const params = organizationMembersRolesRoute.useParams();
    return <OrganizationMembersRolesSection {...params} />;
  },
});

export const organizationMembersGroupsRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'groups',
  component: function OrganizationMembersGroupsRoute() {
    const params = organizationMembersGroupsRoute.useParams();
    return <OrganizationMembersGroupsSection {...params} />;
  },
});

export const organizationMembersInvitationsRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'invitations',
  component: function OrganizationMembersInvitationsRoute() {
    const params = organizationMembersInvitationsRoute.useParams();
    return <OrganizationMembersInvitationsSection {...params} />;
  },
});
