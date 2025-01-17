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
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Link } from '@/components/ui/link';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import { AuthProvider } from '@/gql/graphql';
import { RoleSelector } from './common';
import { MemberInvitationButton } from './invitations';
import { ResourcePicker, ResourceSelection } from './resource-picker';

const OrganizationMemberRoleSwitcher_AssignRoleMutation = graphql(`
  mutation OrganizationMemberRoleSwitcher_AssignRoleMutation($input: AssignMemberRoleInput!) {
    assignMemberRole(input: $input) {
      ok {
        updatedMember {
          id
          user {
            id
            displayName
          }
          role {
            id
            # Updates the members count of the role
            membersCount
          }
        }
        previousMemberRole {
          id
          # Updates the members count of the role
          membersCount
        }
      }
      error {
        message
      }
    }
  }
`);

const OrganizationMemberRoleSwitcher_OrganizationFragment = graphql(`
  fragment OrganizationMemberRoleSwitcher_OrganizationFragment on Organization {
    id
    slug
    viewerCanAssignUserRoles
    owner {
      id
    }
    memberRoles {
      id
      name
      description
      locked
    }
  }
`);

const OrganizationMemberRoleSwitcher_MemberFragment = graphql(`
  fragment OrganizationMemberRoleSwitcher_MemberFragment on Member {
    id
    user {
      id
    }
  }
`);

function OrganizationMemberRoleSwitcher(props: {
  organization: FragmentType<typeof OrganizationMemberRoleSwitcher_OrganizationFragment>;
  memberId: string;
  memberName: string;
  memberRoleId: string;
  member?: FragmentType<typeof OrganizationMemberRoleSwitcher_MemberFragment>;
}) {
  const organization = useFragment(
    OrganizationMemberRoleSwitcher_OrganizationFragment,
    props.organization,
  );
  const member = useFragment(OrganizationMemberRoleSwitcher_MemberFragment, props.member);
  const canAssignRole = organization.viewerCanAssignUserRoles;
  const roles = organization.memberRoles ?? [];
  const { toast } = useToast();
  const [assignRoleState, assignRole] = useMutation(
    OrganizationMemberRoleSwitcher_AssignRoleMutation,
  );
  const memberRole = roles?.find(role => role.id === props.memberRoleId);

  if (!memberRole || !member) {
    console.error('No role or member provided to OrganizationMemberRoleSwitcher');
    return null;
  }

  return (
    <RoleSelector
      className="mx-auto"
      searchPlaceholder="Select new role..."
      roles={roles}
      onSelect={async role => {
        try {
          const result = await assignRole({
            input: {
              organizationSlug: organization.slug,
              roleId: role.id,
              userId: member.user.id,
              // resources: {
              //   allProjects: true,
              // },
            },
          });

          if (result.error) {
            toast({
              variant: 'destructive',
              title: `Failed to assign role to ${props.memberName}`,
              description: result.error.message,
            });
          } else if (result.data?.assignMemberRole.error) {
            toast({
              variant: 'destructive',
              title: `Failed to assign role to ${props.memberName}`,
              description: result.data.assignMemberRole.error.message,
            });
          } else if (result.data?.assignMemberRole.ok) {
            toast({
              title: `Assigned ${role.name} to ${result.data.assignMemberRole.ok.updatedMember.user.displayName}`,
            });
          }
        } catch (error: any) {
          console.error(error);
          toast({
            variant: 'destructive',
            title: `Failed to assign role to ${props.memberName}`,
            description: 'message' in error ? error.message : String(error),
          });
        }
      }}
      defaultRole={memberRole}
      disabled={!canAssignRole || assignRoleState.fetching}
      isRoleActive={role => {
        const isCurrentRole = role.id === props.memberRoleId;

        if (isCurrentRole) {
          return {
            active: false,
            reason: 'This is the current role',
          };
        }

        return {
          active: true,
        };
      }}
    />
  );
}

export const authProviderToIconAndTextMap: Record<
  AuthProvider,
  {
    icon: IconType;
    text: string;
  }
> = {
  [AuthProvider.Google]: {
    icon: FaGoogle,
    text: 'Google OAuth 2.0',
  },
  [AuthProvider.Github]: {
    icon: FaGithub,
    text: 'GitHub OAuth 2.0',
  },
  [AuthProvider.Oidc]: {
    icon: FaOpenid,
    text: 'OpenID Connect',
  },
  [AuthProvider.UsernamePassword]: {
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
    ...OrganizationMemberRoleSwitcher_MemberFragment
    ...AssignedResources_MemberFragment
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
            <OrganizationMemberRoleSwitcher
              organization={organization}
              memberId={member.id}
              memberName={member.user.displayName}
              memberRoleId={member.role.id}
              member={member}
            />
          )}
        </td>
        <td className="relative py-3 text-center text-sm">
          {member.isOwner ? (
            'all resources'
          ) : (
            <AssignedResources member={member} organization={organization} />
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

const AssignedResources_OrganizationFragment = graphql(`
  fragment AssignedResources_OrganizationFragment on Organization {
    id
    ...ResourcePicker_OrganizationFragment
  }
`);

const AssignedResources_MemberFragment = graphql(`
  fragment AssignedResources_MemberFragment on Member {
    id
    resourceAssignment {
      allProjects
      projects {
        project {
          id
          slug
        }
        targets {
          allTargets
          targets {
            target {
              id
              slug
            }
            services {
              allServices
              services
            }
            appDeployments {
              allAppDeployments
              appDeployments
            }
          }
        }
      }
    }
  }
`);

function AssignedResources(props: {
  member: FragmentType<typeof AssignedResources_MemberFragment>;
  organization: FragmentType<typeof AssignedResources_OrganizationFragment>;
}) {
  const member = useFragment(AssignedResources_MemberFragment, props.member);
  const organization = useFragment(AssignedResources_OrganizationFragment, props.organization);

  const [isOpen, setIsOpen] = useState(false);
  const initialSelection = useMemo<ResourceSelection>(() => {
    return {
      projects:
        member.resourceAssignment.allProjects === true
          ? '*'
          : (member.resourceAssignment.projects ?? []).map(record => ({
              id: record.project.id,
              slug: record.project.slug,
              targets:
                record.targets.allTargets === true
                  ? '*'
                  : (record.targets.targets ?? []).map(record => ({
                      id: record.target.id,
                      slug: record.target.slug,
                      appDeployments:
                        record.appDeployments.allAppDeployments === true
                          ? '*'
                          : (record.appDeployments.appDeployments ?? []),
                      services:
                        record.services.allServices === true
                          ? '*'
                          : (record.services.services ?? []),
                    })),
            })),
    };
  }, [member]);

  return (
    <>
      {member.resourceAssignment.allProjects ? (
        'all resources'
      ) : member.resourceAssignment.projects?.length ? (
        <>
          {member.resourceAssignment.projects.length} project
          {member.resourceAssignment.projects.length === 1 ? '' : 's'}
        </>
      ) : (
        'none'
      )}{' '}
      <Dialog open={isOpen} onOpenChange={isOpen => setIsOpen(isOpen)}>
        <DialogTrigger asChild>
          <Link>manage</Link>
        </DialogTrigger>
        <DialogContent className="min-w-[800px]">
          {isOpen && (
            <ResourcePicker initialSelection={initialSelection} organization={organization} />
          )}
        </DialogContent>
      </Dialog>
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
    ...OrganizationMemberRoleSwitcher_OrganizationFragment
    ...MemberInvitationForm_OrganizationFragment
    ...AssignedResources_OrganizationFragment
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
            <th
              className="relative w-[300px] cursor-pointer select-none py-3 text-center align-middle text-sm font-semibold"
              onClick={() => updateSorting('role')}
            >
              Projects
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
