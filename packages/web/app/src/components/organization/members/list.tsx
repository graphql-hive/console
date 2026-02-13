import { memo, useEffect, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import { FaGithub, FaGoogle, FaOpenid, FaUser, FaUserLock } from 'react-icons/fa';
import { IconType } from 'react-icons/lib';
import { useMutation, type UseQueryExecute } from 'urql';
import { useDebouncedCallback } from 'use-debounce';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { cn } from '@/lib/utils';
import { organizationMembersRoute } from '../../../router';
import { MemberInvitationButton } from './invitations';
import { MemberRolePicker } from './member-role-picker';

export const authProviderToIconAndTextMap: Record<
  GraphQLSchema.AuthProviderType,
  {
    Icon: IconType;
    text: string;
  }
> = {
  [GraphQLSchema.AuthProviderType.Google]: {
    Icon: FaGoogle,
    text: 'Google OAuth 2.0',
  },
  [GraphQLSchema.AuthProviderType.Github]: {
    Icon: FaGithub,
    text: 'GitHub OAuth 2.0',
  },
  [GraphQLSchema.AuthProviderType.Oidc]: {
    Icon: FaOpenid,
    text: 'OpenID Connect',
  },
  [GraphQLSchema.AuthProviderType.UsernamePassword]: {
    Icon: FaUserLock,
    text: 'Email & Password',
  },
};

const OrganizationMemberRow_DeleteMember = graphql(`
  mutation OrganizationMemberRow_DeleteMember($input: OrganizationMemberInput!) {
    deleteOrganizationMember(input: $input) {
      organization {
        id
        members {
          edges {
            node {
              ...OrganizationMemberRow_MemberFragment
            }
          }
        }
      }
    }
  }
`);

const OrganizationMemberRow_MemberFragment = graphql(`
  fragment OrganizationMemberRow_MemberFragment on Member {
    id
    user {
      id
      displayName
      email
    }
    authProviders {
      type
      disabledReason
    }
    role {
      id
    }
    isOwner
    viewerCanRemove
    ...MemberRole_MemberFragment
  }
`);

const OrganizationMemberRow = memo(function OrganizationMemberRow(props: {
  organization: FragmentType<typeof OrganizationMembers_OrganizationFragment>;
  member: FragmentType<typeof OrganizationMemberRow_MemberFragment>;
}) {
  const organization = useFragment(OrganizationMembers_OrganizationFragment, props.organization);
  const member = useFragment(OrganizationMemberRow_MemberFragment, props.member);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteMemberState, deleteMember] = useMutation(OrganizationMemberRow_DeleteMember);
  return (
    <>
      <AlertDialog open={open} onOpenChange={setOpen}>
        {open ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete{' '}
                <strong>{member.user.email}</strong> from the organization.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteMemberState.fetching}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteMemberState.fetching}
                onClick={async event => {
                  event.preventDefault();

                  try {
                    const result = await deleteMember({
                      input: {
                        organizationSlug: organization.slug,
                        userId: member.user.id,
                      },
                    });

                    if (result.error) {
                      toast({
                        variant: 'destructive',
                        title: 'Failed to delete a member',
                        description: result.error.message,
                      });
                    } else {
                      toast({
                        title: 'Member deleted',
                        description: `User ${member.user.email} is no longer a member of the organization`,
                      });
                      setOpen(false);
                    }
                  } catch (error) {
                    console.log('Failed to delete a member');
                    console.error(error);
                    toast({
                      variant: 'destructive',
                      title: 'Failed to delete a member',
                      description: String(error),
                    });
                  }
                }}
              >
                {deleteMemberState.fetching ? 'Deleting...' : 'Continue'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
      <tr key={member.id}>
        <td className="w-12">
          <div>
            <FaUser className="mx-auto size-5" />
          </div>
        </td>
        <td className="grow overflow-hidden py-3 text-sm font-medium">
          <div className="flex items-center gap-2">
            <h3 className="line-clamp-1 font-medium">{member.user.displayName}</h3>
            {member.authProviders.map(provider => {
              const providerDisplay = authProviderToIconAndTextMap[provider.type];
              return (
                <TooltipProvider key={provider.type}>
                  <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                      <div className="flex gap-1">
                        <providerDisplay.Icon
                          className={cn('size-4', provider.disabledReason && 'text-neutral-7')}
                        />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-center">
                      {provider.disabledReason
                        ? `${providerDisplay.text} (Disabled - ${provider.disabledReason})`
                        : providerDisplay.text}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
          <h4 className="text-neutral-10 text-xs">{member.user.email}</h4>
        </td>
        <td className="relative py-3 text-center text-sm">
          {member.isOwner ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <span className="font-bold">Owner</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-left">
                  The organization owner has full access to everything within the organization. The
                  role of the owner can not be changed.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <MemberRole member={member} organization={organization} />
          )}
        </td>
        <td className="py-3 text-right text-sm">
          {member.viewerCanRemove && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="data-[state=open]:bg-neutral-3 flex size-8 p-0">
                  <MoreHorizontalIcon className="size-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[160px]">
                <DropdownMenuItem onSelect={() => setOpen(true)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </td>
      </tr>
    </>
  );
});

const MemberRole_OrganizationFragment = graphql(`
  fragment MemberRole_OrganizationFragment on Organization {
    id
    viewerCanAssignUserRoles
    ...MemberRolePicker_OrganizationFragment
  }
`);

const MemberRole_MemberFragment = graphql(`
  fragment MemberRole_MemberFragment on Member {
    id
    role {
      id
      name
    }
    resourceAssignment {
      mode
      projects {
        project {
          id
        }
      }
    }
    ...MemberRolePicker_MemberFragment
  }
`);

function MemberRole(props: {
  member: FragmentType<typeof MemberRole_MemberFragment>;
  organization: FragmentType<typeof MemberRole_OrganizationFragment>;
}) {
  const member = useFragment(MemberRole_MemberFragment, props.member);
  const organization = useFragment(MemberRole_OrganizationFragment, props.organization);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {member.role.name}
      {member.resourceAssignment.mode === GraphQLSchema.ResourceAssignmentModeType.All ? (
        ' (all resources)'
      ) : member.resourceAssignment.projects?.length ? (
        <>
          {' (' + member.resourceAssignment.projects.length} project
          {member.resourceAssignment.projects.length === 1 ? '' : 's'})
        </>
      ) : null}{' '}
      {organization.viewerCanAssignUserRoles && (
        <Sheet.Sheet open={isOpen} onOpenChange={isOpen => setIsOpen(isOpen)}>
          <Sheet.SheetTrigger asChild>
            <button className="text-accent font-medium transition-colors hover:underline">
              change
            </button>
          </Sheet.SheetTrigger>
          {isOpen && (
            <MemberRolePicker
              organization={organization}
              member={member}
              close={() => setIsOpen(false)}
            />
          )}
        </Sheet.Sheet>
      )}
    </>
  );
}

const OrganizationMembers_OrganizationFragment = graphql(`
  fragment OrganizationMembers_OrganizationFragment on Organization {
    id
    slug
    owner {
      id
    }
    members(first: $first, after: $after, filters: { searchTerm: $searchTerm }) {
      edges {
        node {
          id
          role {
            id
          }
          ...OrganizationMemberRow_MemberFragment
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
    viewerCanManageInvitations
    ...MemberInvitationForm_OrganizationFragment
    ...MemberRole_OrganizationFragment
  }
`);

export function OrganizationMembers(props: {
  organization: FragmentType<typeof OrganizationMembers_OrganizationFragment>;
  refetchMembers: UseQueryExecute;
  /**
   * The setter for the reactive "after" variable required by urql
   */
  setAfter: (after: string | null) => void;
}) {
  // Pagination state
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [currentPage, setCurrentPage] = useState(0);

  const search = organizationMembersRoute.useSearch();

  const organization = useFragment(OrganizationMembers_OrganizationFragment, props.organization);
  const members = organization.members?.edges?.map(edge => edge.node);
  const pageInfo = organization.members?.pageInfo;

  // Reset pagination when search changes
  useEffect(() => {
    setCursorHistory([null]);
    setCurrentPage(0);
    props.setAfter(null);
  }, [search.search]);

  useEffect(() => {
    // Update the cursor in parent, which will trigger query refetch
    props.setAfter(cursorHistory[currentPage]);
  }, [currentPage]);

  const [searchValue, setSearchValue] = useSearchParamsFilter<string>('search', '');

  const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  }, 300);

  const handleNextPage = (endCursor: string) => {
    setCursorHistory(prev => [...prev, endCursor]);
    setCurrentPage(prev => prev + 1);
  };

  const handlePreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="List of organization members"
        description="Manage the members of your organization and their permissions."
      >
        <div className="flex flex-row gap-4">
          <Input
            className="w-[220px] grow cursor-text"
            placeholder="Search by username or email"
            onChange={handleSearchChange}
            defaultValue={searchValue}
          />
          {organization.viewerCanManageInvitations && (
            <MemberInvitationButton
              refetchInvitations={props.refetchMembers}
              organization={organization}
            />
          )}
        </div>
      </SubPageLayoutHeader>
      <table className="divide-neutral-10/20 w-full table-auto divide-y-[1px]">
        <thead>
          <tr>
            <th colSpan={2} className="relative select-none py-3 text-left text-sm font-semibold">
              Member
            </th>
            <th className="relative w-[300px] select-none py-3 text-center align-middle text-sm font-semibold">
              Assigned Role
            </th>
            <th className="w-12 py-3 text-right text-sm font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-neutral-10/20 divide-y-[1px]">
          {members.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-16">
                <div className="flex flex-col items-center justify-center px-4">
                  <h3 className="text-neutral-11 mb-2 text-lg font-semibold">No members found</h3>

                  <p className="text-neutral-10 max-w-sm text-center text-sm">
                    {`No results for "${searchValue}". Try adjusting your search term.`}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            members.map(node => (
              <OrganizationMemberRow
                key={node.id}
                organization={props.organization}
                member={node}
              />
            ))
          )}
        </tbody>
      </table>
      {/* Pagination Controls */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-neutral-10 text-sm">
          Page {currentPage + 1}
          {searchValue && members.length > 0 && ` - showing results for "${searchValue}"`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              handlePreviousPage();
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 0);
            }}
            disabled={currentPage === 0}
          >
            <ChevronLeftIcon className="mr-1 size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (pageInfo?.endCursor) {
                handleNextPage(pageInfo.endCursor);
              }
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 0);
            }}
            disabled={!pageInfo?.hasNextPage}
          >
            Next
            <ChevronRightIcon className="ml-1 size-4" />
          </Button>
        </div>
      </div>
    </SubPageLayout>
  );
}
