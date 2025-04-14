import { useCallback, useMemo, useState } from 'react';
import { MoreHorizontalIcon, MoveDownIcon, MoveUpIcon } from 'lucide-react';
import type { IconType } from 'react-icons';
import { FaGithub, FaGoogle, FaOpenid, FaUserLock } from 'react-icons/fa';
import { useMutation } from 'urql';
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
import { Link } from '@/components/ui/link';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { MemberInvitationButton } from './invitations';
import { MemberRolePicker } from './member-role-picker';

export const authProviderToIconAndTextMap: Record<
  GraphQLSchema.AuthProvider,
  {
    icon: IconType;
    text: string;
  }
> = {
  [GraphQLSchema.AuthProvider.Google]: {
    icon: FaGoogle,
    text: 'Google OAuth 2.0',
  },
  [GraphQLSchema.AuthProvider.Github]: {
    icon: FaGithub,
    text: 'GitHub OAuth 2.0',
  },
  [GraphQLSchema.AuthProvider.Oidc]: {
    icon: FaOpenid,
    text: 'OpenID Connect',
  },
  [GraphQLSchema.AuthProvider.UsernamePassword]: {
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
          total
          nodes {
            ...OrganizationMemberRow_MemberFragment
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

function OrganizationMemberRow(props: {
  organization: FragmentType<typeof OrganizationMembers_OrganizationFragment>;
  member: FragmentType<typeof OrganizationMemberRow_MemberFragment>;
  refetchMembers(): void;
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
}

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
    members {
      nodes {
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
      total
    }
    viewerCanManageInvitations
    ...MemberInvitationForm_OrganizationFragment
    ...MemberRole_OrganizationFragment
  }
`);

export function OrganizationMembers(props: {
  organization: FragmentType<typeof OrganizationMembers_OrganizationFragment>;
  refetchMembers(): void;
}) {
  const organization = useFragment(OrganizationMembers_OrganizationFragment, props.organization);
  const members = organization.members?.nodes;
  const [orderDirection, setOrderDirection] = useState<'asc' | 'desc' | null>(null);
  const [sortByKey, setSortByKey] = useState<'name' | 'role'>('name');

  const sortedMembers = useMemo(() => {
    if (!members) {
      return [];
    }

    if (!orderDirection) {
      return members ?? [];
    }

    const sorted = [...members].sort((a, b) => {
      if (sortByKey === 'name') {
        return a.user.displayName.localeCompare(b.user.displayName);
      }

      if (sortByKey === 'role') {
        return (a.role?.name ?? 'Select role').localeCompare(b.role?.name ?? 'Select role') ?? 0;
      }

      return 0;
    });

    return orderDirection === 'asc' ? sorted : sorted.reverse();
  }, [members, orderDirection, sortByKey]);

  const updateSorting = useCallback(
    (newSortBy: 'name' | 'role') => {
      if (newSortBy === sortByKey) {
        setOrderDirection(
          orderDirection === 'asc' ? 'desc' : orderDirection === 'desc' ? null : 'asc',
        );
      } else {
        setSortByKey(newSortBy);
        setOrderDirection('asc');
      }
    },
    [sortByKey, orderDirection],
  );

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="List of organization members"
        description="Manage the members of your organization and their permissions."
      >
        {organization.viewerCanManageInvitations && (
          <MemberInvitationButton
            refetchInvitations={props.refetchMembers}
            organization={organization}
          />
        )}
      </SubPageLayoutHeader>
      <table className="w-full table-auto divide-y-[1px] divide-gray-500/20">
        <thead>
          <tr>
            <th
              colSpan={2}
              className="relative cursor-pointer select-none py-3 text-left text-sm font-semibold"
              onClick={() => updateSorting('name')}
            >
              Member
              <span className="inline-block">
                {sortByKey === 'name' ? (
                  orderDirection === 'asc' ? (
                    <MoveUpIcon className="relative top-[3px] size-4" />
                  ) : orderDirection === 'desc' ? (
                    <MoveDownIcon className="relative top-[3px] size-4" />
                  ) : null
                ) : null}
              </span>
            </th>
            <th
              className="relative w-[300px] cursor-pointer select-none py-3 text-center align-middle text-sm font-semibold"
              onClick={() => updateSorting('role')}
            >
              Assigned Role
              <span className="inline-block">
                {sortByKey === 'role' ? (
                  orderDirection === 'asc' ? (
                    <MoveUpIcon className="relative top-[3px] size-4" />
                  ) : orderDirection === 'desc' ? (
                    <MoveDownIcon className="relative top-[3px] size-4" />
                  ) : null
                ) : null}
              </span>
            </th>
            <th className="w-12 py-3 text-right text-sm font-semibold" />
          </tr>
        </thead>
        <tbody className="divide-y-[1px] divide-gray-500/20">
          {sortedMembers.map(node => (
            <OrganizationMemberRow
              key={node.id}
              refetchMembers={props.refetchMembers}
              organization={props.organization}
              member={node}
            />
          ))}
        </tbody>
      </table>
    </SubPageLayout>
  );
}
