import { useMemo } from 'react';
import { useQuery } from 'urql';
import { OrganizationLayout, Page } from '@/components/layouts/organization';
import { OrganizationInvitations } from '@/components/organization/members/invitations';
import { OrganizationMembers } from '@/components/organization/members/list';
import { OrganizationMemberRoles } from '@/components/organization/members/roles';
import { Button } from '@/components/ui/button';
import { Meta } from '@/components/ui/meta';
import { NavLayout, PageLayout, PageLayoutContent } from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRedirect } from '@/lib/access/common';
import { cn } from '@/lib/utils';

const OrganizationMembersPage_OrganizationFragment = graphql(`
  fragment OrganizationMembersPage_OrganizationFragment on Organization {
    ...OrganizationInvitations_OrganizationFragment
    ...OrganizationMemberRoles_OrganizationFragment
    ...OrganizationMembers_OrganizationFragment
    ...SelectedPermissionOverview_MemberPermissionGroupsFragment
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

type SubPage = (typeof subPages)[number]['key'];

function PageContent(props: {
  page: SubPage;
  onPageChange(page: SubPage): void;
  organization: FragmentType<typeof OrganizationMembersPage_OrganizationFragment>;
  refetchQuery(): void;
}) {
  const organization = useFragment(
    OrganizationMembersPage_OrganizationFragment,
    props.organization,
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
                props.page === subPage.key
                  ? 'bg-muted hover:bg-muted'
                  : 'hover:bg-transparent hover:underline',
                'justify-start',
              )}
              onClick={() => props.onPageChange(subPage.key)}
            >
              {subPage.title}
            </Button>
          );
        })}
      </NavLayout>
      <PageLayoutContent>
        {props.page === 'list' ? (
          <OrganizationMembers refetchMembers={props.refetchQuery} organization={organization} />
        ) : null}
        {props.page === 'roles' && organization.viewerCanManageRoles ? (
          <OrganizationMemberRoles organization={organization} />
        ) : null}
        {props.page === 'invitations' && organization.viewerCanManageInvitations ? (
          <OrganizationInvitations
            refetchInvitations={props.refetchQuery}
            organization={organization}
          />
        ) : null}
      </PageLayoutContent>
    </PageLayout>
  );
}

const OrganizationMembersPageQuery = graphql(`
  query OrganizationMembersPageQuery($selector: OrganizationSelectorInput!) {
    organization(selector: $selector) {
      organization {
        ...OrganizationMembersPage_OrganizationFragment
        viewerCanSeeMembers
      }
    }
  }
`);

function OrganizationMembersPageContent(props: {
  organizationSlug: string;
  page: SubPage;
  onPageChange(page: SubPage): void;
}) {
  const [query, refetch] = useQuery({
    query: OrganizationMembersPageQuery,
    variables: {
      selector: {
        organizationSlug: props.organizationSlug,
      },
    },
  });

  const currentOrganization = query.data?.organization?.organization;

  useRedirect({
    canAccess: currentOrganization?.viewerCanSeeMembers === true,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug',
        params: {
          organizationSlug: props.organizationSlug,
        },
      });
    },
    entity: currentOrganization,
  });

  if (currentOrganization?.viewerCanSeeMembers === false) {
    return null;
  }

  if (query.error) {
    return <QueryError organizationSlug={props.organizationSlug} error={query.error} />;
  }

  return (
    <OrganizationLayout
      organizationSlug={props.organizationSlug}
      page={Page.Members}
      className="flex flex-col gap-y-10"
    >
      {currentOrganization ? (
        <PageContent
          page={props.page}
          onPageChange={props.onPageChange}
          refetchQuery={() => {
            refetch({ requestPolicy: 'network-only' });
          }}
          organization={currentOrganization}
        />
      ) : null}
    </OrganizationLayout>
  );
}

export function OrganizationMembersPage(props: {
  organizationSlug: string;
  page: SubPage;
  onPageChange(page: SubPage): void;
}) {
  return (
    <>
      <Meta title="Members" />
      <OrganizationMembersPageContent
        organizationSlug={props.organizationSlug}
        page={props.page}
        onPageChange={props.onPageChange}
      />
    </>
  );
}
