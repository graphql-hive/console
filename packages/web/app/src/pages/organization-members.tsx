import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { organizationMembersRoute } from '../router';

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

type SubPage = (typeof subPages)[number]['key'];

function PageContent(props: {
  page: SubPage;
  onPageChange(page: SubPage): void;
  organization: FragmentType<typeof OrganizationMembersPage_OrganizationFragment>;
  refetchQuery(): void;
  currentPage: number;
  onNextPage(endCursor: string): void;
  onPreviousPage(): void;
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
          <OrganizationMembers
            refetchMembers={props.refetchQuery}
            organization={organization}
            currentPage={props.currentPage}
            onNextPage={props.onNextPage}
            onPreviousPage={props.onPreviousPage}
          />
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
  query OrganizationMembersPageQuery(
    $organizationSlug: String!
    $searchTerm: String
    $first: Int
    $after: String
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      ...OrganizationMembersPage_OrganizationFragment
      viewerCanSeeMembers
    }
  }
`);

function OrganizationMembersPageContent(props: {
  organizationSlug: string;
  page: SubPage;
  onPageChange(page: SubPage): void;
}) {
  const search = organizationMembersRoute.useSearch();

  // Pagination state
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [currentPage, setCurrentPage] = useState(0);

  // Reset pagination when search changes
  useEffect(() => {
    setCursorHistory([null]);
    setCurrentPage(0);
  }, [search.search]);

  const queryVariables = {
    organizationSlug: props.organizationSlug,
    searchTerm: search.search || undefined,
    first: 20,
    after: cursorHistory[currentPage],
  };

  const [query, refetch] = useQuery({
    query: OrganizationMembersPageQuery,
    variables: queryVariables,
  });

  const handleNextPage = useCallback((endCursor: string) => {
    setCursorHistory(prev => [...prev, endCursor]);
    setCurrentPage(prev => prev + 1);
  }, []);

  const handlePreviousPage = useCallback(() => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  }, [currentPage]);

  const refetchQuery = useCallback(() => {
    refetch({ requestPolicy: 'network-only' });
  }, [refetch]);

  useRedirect({
    canAccess: query.data?.organization?.viewerCanSeeMembers === true,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug',
        params: {
          organizationSlug: props.organizationSlug,
        },
      });
    },
    entity: query.data?.organization,
  });

  if (query.data?.organization?.viewerCanSeeMembers === false) {
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
      {query.data?.organization ? (
        <PageContent
          page={props.page}
          onPageChange={props.onPageChange}
          refetchQuery={refetchQuery}
          organization={query.data.organization}
          currentPage={currentPage}
          onNextPage={handleNextPage}
          onPreviousPage={handlePreviousPage}
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
