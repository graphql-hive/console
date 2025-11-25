import { memo, useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon, MoreHorizontalIcon } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaGithub, FaGoogle, FaOpenid, FaUserLock } from 'react-icons/fa';
import { useMutation } from 'urql';
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
import { Link } from '@/components/ui/link';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { MemberInvitationButton } from './invitations';
import { MemberRolePicker } from './member-role-picker';

export const authProviderToIconAndTextMap: Record<
  GraphQLSchema.AuthProviderType,
  {
    icon: IconType;
    text: string;
  }
> = {
  [GraphQLSchema.AuthProviderType.Google]: {
    icon: FaGoogle,
    text: 'Google OAuth 2.0',
  },
  [GraphQLSchema.AuthProviderType.Github]: {
    icon: FaGithub,
    text: 'GitHub OAuth 2.0',
  },
  [GraphQLSchema.AuthProviderType.Oidc]: {
    icon: FaOpenid,
    text: 'OpenID Connect',
  },
  [GraphQLSchema.AuthProviderType.UsernamePassword]: {
    icon: FaUserLock,
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
      provider
      displayName
      email
    }
    role {
      id
      name
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
  const IconToUse = authProviderToIconAndTextMap[member.user.provider].icon;
  const authMethod = authProviderToIconAndTextMap[member.user.provider].text;
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
          <TooltipProvider>
            <Tooltip delayDuration={100}>
              <TooltipTrigger asChild>
                <div>
                  <IconToUse className="mx-auto size-5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>User's authentication method: {authMethod}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </td>
        <td className="grow overflow-hidden py-3 text-sm font-medium">
          <h3 className="line-clamp-1 font-medium">{member.user.displayName}</h3>
          <h4 className="text-xs text-gray-400">{member.user.email}</h4>
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
                <Button variant="ghost" className="data-[state=open]:bg-muted flex size-8 p-0">
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
          slug
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
            <Link>change</Link>
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
        cursor
        node {
          id
          user {
            displayName
          }
          role {
            id
            name
          }
          ...OrganizationMemberRow_MemberFragment
        }
      }
      pageInfo {
        hasNextPage
        hasPreviousPage
        startCursor
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
  refetchMembers(): void;
  currentPage: number;
  onNextPage(): void;
  onPreviousPage(): void;
}) {
  const organization = useFragment(OrganizationMembers_OrganizationFragment, props.organization);
  const members = organization.members?.edges?.map(edge => edge.node);
  const pageInfo = organization.members?.pageInfo;

  const [search, setSearch] = useSearchParamsFilter<string>('search', '');

  const handleSearchChange = useDebouncedCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  }, 300);

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
            defaultValue={search}
          />
          {organization.viewerCanManageInvitations && (
            <MemberInvitationButton
              refetchInvitations={props.refetchMembers}
              organization={organization}
            />
          )}
        </div>
      </SubPageLayoutHeader>
      <table className="w-full table-auto divide-y-[1px] divide-gray-500/20">
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
        <tbody className="divide-y-[1px] divide-gray-500/20">
          {members.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-16">
                <div className="flex flex-col items-center justify-center px-4">
                  <h3 className="mb-2 text-lg font-semibold text-gray-100">No members found</h3>

                  <p className="max-w-sm text-center text-sm text-gray-200">
                    {`No results for "${search}". Try adjusting your search term.`}
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
        <div className="text-sm text-gray-500">
          Page {props.currentPage + 1}
          {search && members.length > 0 && ` - search results for "${search}"`}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              props.onPreviousPage();
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 0);
            }}
            disabled={props.currentPage === 0}
          >
            <ChevronLeftIcon className="mr-1 size-4" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              props.onNextPage();
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
