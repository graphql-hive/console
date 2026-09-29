import { useCallback } from 'react';
import { useQuery } from 'urql';
import { Navigation } from '@/components/base/navigation/navigation';
import { Spinner } from '@/components/base/spinner/spinner';
import { LayoutContent } from '@/components/layouts/layout-content';
import { Groups } from '@/components/organization/members/groups';
import { OrganizationInvitations } from '@/components/organization/members/invitations';
import { OrganizationMembers } from '@/components/organization/members/list';
import { OrganizationMemberRoles } from '@/components/organization/members/roles';
import { Meta } from '@/components/ui/meta';
import { PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { getRouteApi, Outlet } from '@tanstack/react-router';

const membersListRoute = getRouteApi('/authenticated/with-header/$organizationSlug/view/members/');

const OrganizationMembersPage_OrganizationFragment = graphql(`
  fragment OrganizationMembersPage_OrganizationFragment on Organization {
    ...OrganizationInvitations_OrganizationFragment
    ...OrganizationMemberRoles_OrganizationFragment
    ...OrganizationMembers_OrganizationFragment

    viewerCanManageInvitations
    viewerCanManageRoles
  }
`);

export const OrganizationMembersPageQuery = graphql(`
  query OrganizationMembersPageQuery(
    $organizationSlug: String!
    $searchTerm: String
    $first: Int
    $after: String
    $needsSCIMManagementConfirmation: Boolean
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      ...OrganizationMembersPage_OrganizationFragment
      viewerCanSeeMembers
      viewerCanManageRoles
      viewerCanManageInvitations
    }
  }
`);

const PAGE_SIZE = 20;

/**
 * One document serves the layout and every section; the list adds its filter and cursor. Roles,
 * groups and invitations ask for the unfiltered first page, which the layout has already fetched.
 */
export function membersVariables(
  organizationSlug: string,
  list: { searchTerm?: string; needsSCIMManagementConfirmation?: boolean; after: string | null } = {
    after: null,
  },
) {
  return { organizationSlug, first: PAGE_SIZE, ...list };
}

export type MembersSectionId = 'list' | 'roles' | 'groups' | 'invitations';

type Section = {
  id: MembersSectionId;
  label: string;
  to: `/$organizationSlug/view/members${'' | `/${Exclude<MembersSectionId, 'list'>}`}`;
  exact?: boolean;
};

// The sections in nav order. The bare URL is the list.
const sections: readonly Section[] = [
  { id: 'list', label: 'Members', to: '/$organizationSlug/view/members', exact: true },
  { id: 'roles', label: 'Roles', to: '/$organizationSlug/view/members/roles' },
  { id: 'groups', label: 'Groups', to: '/$organizationSlug/view/members/groups' },
  { id: 'invitations', label: 'Invitations', to: '/$organizationSlug/view/members/invitations' },
];

// The sections this viewer may open; the route loaders and the nav both read it.
export function membersSections(organization: {
  viewerCanManageRoles: boolean;
  viewerCanManageInvitations: boolean;
}) {
  const ids = new Set<MembersSectionId>(['list', 'groups']);
  if (organization.viewerCanManageRoles) {
    ids.add('roles');
  }
  if (organization.viewerCanManageInvitations) {
    ids.add('invitations');
  }
  return sections.filter(section => ids.has(section.id));
}

export function OrganizationMembersPage() {
  const slugs = useSlugs('organization');
  const { organizationSlug } = slugs;
  const [query] = useQuery({
    query: OrganizationMembersPageQuery,
    variables: membersVariables(organizationSlug),
  });
  const organization = useFragment(
    OrganizationMembersPage_OrganizationFragment,
    query.data?.organization,
  );
  const visible = query.data?.organization ? membersSections(query.data.organization) : [];

  if (query.error) {
    return <QueryError organizationSlug={organizationSlug} error={query.error} />;
  }

  return (
    <>
      <Meta title="Members" />
      <LayoutContent className="flex flex-col gap-y-10">
        {organization ? (
          <PageLayout>
            <Navigation
              aria-label="Members"
              variant="list"
              items={visible.map(section => ({
                label: section.label,
                to: section.to,
                params: slugs,
                exact: section.exact,
              }))}
            />
            <PageLayoutContent>
              <Outlet />
            </PageLayoutContent>
          </PageLayout>
        ) : query.fetching ? (
          <div className="flex justify-center py-12">
            <Spinner variants={{ size: 'lg' }} />
          </div>
        ) : null}
      </LayoutContent>
    </>
  );
}

export function OrganizationMembersListSection() {
  const { organizationSlug } = useSlugs('organization');
  const search = membersListRoute.useSearch();
  const [after, setAfter] = useResetState<string | null>(null, [search.search]);

  const [query, refetch] = useQuery({
    query: OrganizationMembersPageQuery,
    variables: membersVariables(organizationSlug, {
      searchTerm: search.search || undefined,
      needsSCIMManagementConfirmation: search.showPendingSCIMManagementConfirmations,
      after,
    }),
  });

  const refetchQuery = useCallback(() => {
    refetch({ requestPolicy: 'network-only' });
  }, [refetch]);

  // A search or cursor change swaps the variables, which would blank the list until the new result
  // lands; the last result stays up and the paging bar reports the fetch instead.
  const loading = query.fetching || query.stale;
  const data = useKeepPreviousData(query.data, loading);
  const organization = useFragment(
    OrganizationMembersPage_OrganizationFragment,
    data?.organization,
  );

  if (!organization) {
    return null;
  }

  return (
    <OrganizationMembers
      refetchMembers={refetchQuery}
      organization={organization}
      setAfter={setAfter}
      loading={loading}
    />
  );
}

/** The unfiltered first page the layout fetched, for the sections that only read the fragments. */
function useMembersOrganization(organizationSlug: string) {
  const [query, refetch] = useQuery({
    query: OrganizationMembersPageQuery,
    variables: membersVariables(organizationSlug),
  });
  const organization = useFragment(
    OrganizationMembersPage_OrganizationFragment,
    query.data?.organization,
  );
  const refetchQuery = useCallback(() => {
    refetch({ requestPolicy: 'network-only' });
  }, [refetch]);
  return { organization, refetchQuery };
}

export function OrganizationMembersRolesSection() {
  const { organizationSlug } = useSlugs('organization');
  const { organization } = useMembersOrganization(organizationSlug);
  return organization ? <OrganizationMemberRoles organization={organization} /> : null;
}

export function OrganizationMembersGroupsSection() {
  const { organizationSlug } = useSlugs('organization');
  const { organization } = useMembersOrganization(organizationSlug);
  return organization ? <Groups /> : null;
}

export function OrganizationMembersInvitationsSection() {
  const { organizationSlug } = useSlugs('organization');
  const { organization, refetchQuery } = useMembersOrganization(organizationSlug);
  return organization ? (
    <OrganizationInvitations refetchInvitations={refetchQuery} organization={organization} />
  ) : null;
}
