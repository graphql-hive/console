import { useCallback, useMemo } from 'react';
import { useQuery, UseQueryExecute } from 'urql';
import z from 'zod';
import { OrganizationInvitations } from '@/components/organization/members/invitations';
import { OrganizationMembers } from '@/components/organization/members/list';
import { OrganizationMemberRoles } from '@/components/organization/members/roles';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { NavLayout, PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRedirect } from '@/lib/access/common';
import { cn } from '@/lib/utils';
import { useNavigate } from '@tanstack/react-router';
import { organizationMembersRoute, OrganizationMembersRouteSearch } from '../router';

const OrganizationMembersPage_OrganizationFragment = graphql(`
  fragment OrganizationMembersPage_OrganizationFragment on Organization {
    ...OrganizationInvitations_OrganizationFragment
    ...OrganizationMemberRoles_OrganizationFragment
    ...OrganizationMembers_OrganizationFragment

    viewerCanManageInvitations
    viewerCanManageRoles
  }
`);

const subPages = [
  {
    key: 'list',
    title: 'Members',
  },
  {
    key: 'roles',
    title: 'Roles',
  },
  {
    key: 'invitations',
    title: 'Invitations',
  },
] as const;

function PageContent(props: {
  organization: FragmentType<typeof OrganizationMembersPage_OrganizationFragment>;
  refetchQuery: UseQueryExecute;
}) {
  const organization = useFragment(
    OrganizationMembersPage_OrganizationFragment,
    props.organization,
  );

  const { page } = organizationMembersRoute.useSearch();
  const navigate = useNavigate({ from: organizationMembersRoute.fullPath });
  const onPageChange = useCallback(
    (newPage: z.infer<typeof OrganizationMembersRouteSearch>['page']) => {
      void navigate({ search: { page: newPage, search: undefined } });
    },
    [navigate],
  );

  const filteredSubPages = useMemo(() => {
    return subPages.filter(page => {
      if (!organization.viewerCanManageInvitations && page.key === 'invitations') {
        return false;
      }
      if (!organization.viewerCanManageRoles && page.key === 'roles') {
        return false;
      }
      return true;
    });
  }, [organization.viewerCanManageInvitations, organization.viewerCanManageRoles]);

  if (!organization) {
    return null;
  }

  return (
    <PageLayout>
      <NavLayout>
        {filteredSubPages.map(subPage => {
          return (
            <Button
              key={subPage.key}
              variant="ghost"
              className={cn(
                page === subPage.key
                  ? 'bg-muted hover:bg-muted'
                  : 'hover:bg-transparent hover:underline',
                'justify-start',
              )}
              onClick={() => onPageChange(subPage.key)}
            >
              {subPage.title}
            </Button>
          );
        })}
      </NavLayout>
      <PageLayoutContent>
        {page === 'list' ? (
          <OrganizationMembers refetchMembers={props.refetchQuery} organization={organization} />
        ) : null}
        {page === 'roles' && organization.viewerCanManageRoles ? (
          <OrganizationMemberRoles organization={organization} />
        ) : null}
        {page === 'invitations' && organization.viewerCanManageInvitations ? (
          <OrganizationInvitations
            refetchInvitations={props.refetchQuery}
            organization={organization}
          />
        ) : null}
      </PageLayoutContent>
    </PageLayout>
  );
}

export const OrganizationMembersPageWithLayoutQuery = graphql(`
  query OrganizationMembersPageWithLayoutQuery(
    $organizationSlug: String!
    $searchTerm: String
    $first: Int
    $after: String
  ) {
    ...OrganizationLayoutDataFragment

    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      ...OrganizationMembersPage_OrganizationFragment
      viewerCanSeeMembers
    }
  }
`);

function OrganizationMembersPageContent() {
  const data = organizationMembersRoute.useLoaderData();

  const { organizationSlug } = organizationMembersRoute.useParams();
  const { after, search: searchTerm } = organizationMembersRoute.useSearch();

  const [_query, refetch] = useQuery({
    query: OrganizationMembersPageWithLayoutQuery,
    variables: {
      organizationSlug,
      searchTerm,
      first: 20,
      after,
    },
    pause: true,
  });

  useRedirect({
    canAccess: data?.organization?.viewerCanSeeMembers === true,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug',
        params: {
          organizationSlug,
        },
      });
    },
    entity: data?.organization,
  });

  const refetchQuery = useCallback(() => {
    refetch({ requestPolicy: 'network-only' });
  }, [refetch]);

  if (data?.organization?.viewerCanSeeMembers === false) {
    return null;
  }

  return (
    <>
      {data?.organization ? (
        <PageContent organization={data.organization} refetchQuery={refetchQuery} />
      ) : null}
    </>
  );
}

export function OrganizationMembersPage() {
  return (
    <>
      <Meta title="Members" />
      <OrganizationMembersPageContent />
    </>
  );
}
