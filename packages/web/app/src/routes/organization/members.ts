import { z } from 'zod';
import {
  Groups_OrganizationGroupQuery,
  groupsVariables,
} from '@/components/organization/members/groups';
import { loadQuery, requireLayoutFlag, revalidate, type LoaderContext } from '@/lib/route-utils';
import {
  membersSections,
  membersVariables,
  OrganizationMembersGroupsSection,
  OrganizationMembersInvitationsSection,
  OrganizationMembersListSection,
  OrganizationMembersPage,
  OrganizationMembersPageQuery,
  OrganizationMembersRolesSection,
  type MembersSectionId,
} from '@/pages/organization-members';
import { createRoute, redirect } from '@tanstack/react-router';
import { zodValidator } from '@tanstack/zod-adapter';
import { legacySearch, legacySearchRedirect } from '../legacy';
import { organizationRoute } from './route';

type MembersLoader = LoaderContext & { params: { organizationSlug: string } };

// The page document and the layout gate start together; both are awaited.
async function loadMembers(loader: MembersLoader) {
  const { organizationSlug } = loader.params;
  const page = loadQuery(loader, OrganizationMembersPageQuery, membersVariables(organizationSlug));
  await requireLayoutFlag.organization(loader, 'viewerCanSeeMembers');
  return (await page).data?.organization;
}

// A section the viewer may not open falls back to the list.
async function loadSection(loader: MembersLoader, id: MembersSectionId) {
  const organization = await loadMembers(loader);
  if (organization && !membersSections(organization).some(section => section.id === id)) {
    throw redirect({ to: '/$organizationSlug/view/members', params: loader.params });
  }
}

export const organizationMembersRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/members',
  loader: async loader => {
    await loadMembers(loader);
  },
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
  loaderDeps: ({ search }) => ({
    searchTerm: search.search || undefined,
    needsSCIMManagementConfirmation: search.showPendingSCIMManagementConfirmations,
  }),
  loader: loader => {
    const { organizationSlug } = loader.params;
    void loadQuery(
      loader,
      OrganizationMembersPageQuery,
      membersVariables(organizationSlug, { ...loader.deps, after: null }),
    );
  },
  component: OrganizationMembersListSection,
});

export const organizationMembersRolesRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'roles',
  loader: loader => loadSection(loader, 'roles'),
  component: OrganizationMembersRolesSection,
});

// Groups arrive from the identity provider, so the list revalidates on every visit.
export const organizationMembersGroupsRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'groups',
  validateSearch: zodValidator(z.object({ search: z.string().optional() })),
  loaderDeps: ({ search }) => ({ search: search.search || null }),
  preloadStaleTime: 0,
  loader: loader => {
    void loadQuery(
      loader,
      Groups_OrganizationGroupQuery,
      groupsVariables(loader.params.organizationSlug, loader.deps.search, null),
      revalidate(loader),
    );
    return loadSection(loader, 'groups');
  },
  component: OrganizationMembersGroupsSection,
});

export const organizationMembersInvitationsRoute = createRoute({
  getParentRoute: () => organizationMembersRoute,
  path: 'invitations',
  loader: loader => loadSection(loader, 'invitations'),
  component: OrganizationMembersInvitationsSection,
});
