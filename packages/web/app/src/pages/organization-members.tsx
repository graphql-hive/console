import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { useRedirect } from '@/lib/access/common';
import { useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import {
  getRouteApi,
  Outlet,
  useChildMatches,
  type RegisteredRouter,
  type RouteIds,
} from '@tanstack/react-router';

const membersListRoute = getRouteApi('/authenticated/$organizationSlug/view/members/');

const OrganizationMembersPage_OrganizationFragment = graphql(`
  fragment OrganizationMembersPage_OrganizationFragment on Organization {
    ...OrganizationInvitations_OrganizationFragment
    ...OrganizationMemberRoles_OrganizationFragment
    ...OrganizationMembers_OrganizationFragment
    ...Groups_OrganizationFragment

    viewerCanManageInvitations
    viewerCanManageRoles
  }
`);

const OrganizationMembersPageQuery = graphql(`
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
    }
  }
`);

const PAGE_SIZE = 20;

/**
 * One document serves the layout and every section; the list adds its filter and cursor. Roles,
 * groups and invitations ask for the unfiltered first page, which the layout has already fetched.
 */
function membersVariables(
  organizationSlug: string,
  list: { searchTerm?: string; needsSCIMManagementConfirmation?: boolean; after: string | null } = {
    after: null,
  },
) {
  return { organizationSlug, first: PAGE_SIZE, ...list };
}

const MEMBERS = '/authenticated/$organizationSlug/view/members';

type SectionId = 'list' | 'roles' | 'groups' | 'invitations';

type Section = {
  id: SectionId;
  label: string;
  routeId: RouteIds<RegisteredRouter['routeTree']>;
  to: `/$organizationSlug/view/members${'' | `/${Exclude<SectionId, 'list'>}`}`;
  exact?: boolean;
};

/**
 * The sections in nav order, with the route each renders under; the permission gate compares the
 * matched child route against the items the viewer may see. The bare URL is the list.
 */
const sections: readonly Section[] = [
  {
    id: 'list',
    label: 'Members',
    routeId: `${MEMBERS}/`,
    to: '/$organizationSlug/view/members',
    exact: true,
  },
  {
    id: 'roles',
    label: 'Roles',
    routeId: `${MEMBERS}/roles`,
    to: '/$organizationSlug/view/members/roles',
  },
  {
    id: 'groups',
    label: 'Groups',
    routeId: `${MEMBERS}/groups`,
    to: '/$organizationSlug/view/members/groups',
  },
  {
    id: 'invitations',
    label: 'Invitations',
    routeId: `${MEMBERS}/invitations`,
    to: '/$organizationSlug/view/members/invitations',
  },
];

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

  useRedirect({
    canAccess: query.data?.organization?.viewerCanSeeMembers === true,
    entity: query.data?.organization,
    redirectTo: router => {
      void router.navigate({ to: '/$organizationSlug', params: slugs });
    },
  });

  const visible = useMemo(() => {
    const ids = new Set<SectionId>(['list', 'groups']);
    if (organization?.viewerCanManageRoles) {
      ids.add('roles');
    }
    if (organization?.viewerCanManageInvitations) {
      ids.add('invitations');
    }
    return sections.filter(section => ids.has(section.id));
  }, [organization]);

  const sectionRouteId = useChildMatches({ select: matches => matches.at(-1)?.routeId });
  const allowed = visible.some(section => section.routeId === sectionRouteId);

  // A section the viewer may not open falls back to the list.
  useRedirect({
    canAccess: allowed,
    entity: organization,
    redirectTo: router => {
      void router.navigate({ to: '/$organizationSlug/view/members', params: slugs, replace: true });
    },
  });

  if (query.data?.organization?.viewerCanSeeMembers === false) {
    return null;
  }

  if (query.error) {
    return <QueryError organizationSlug={organizationSlug} error={query.error} />;
  }

  return (
    <>
      <Meta title="Members" />
      <LayoutContent className="flex flex-col gap-y-10">
        {allowed && organization ? (
          <PageLayout>
            <Navigation
              aria-label="Members"
              variant="list"
              items={visible.map(section => ({
                id: section.id,
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
  const [after, setAfter] = useState<string | null>(null);

  // Reset cursor when search changes
  useEffect(() => {
    setAfter(null);
  }, [search.search]);

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
  return organization ? <Groups organization={organization} /> : null;
}

export function OrganizationMembersInvitationsSection() {
  const { organizationSlug } = useSlugs('organization');
  const { organization, refetchQuery } = useMembersOrganization(organizationSlug);
  return organization ? (
    <OrganizationInvitations refetchInvitations={refetchQuery} organization={organization} />
  ) : null;
}
