import { useEffect, useMemo, useState } from 'react';
import {
  Info,
  SearchIcon,
  ShieldCheck,
  TriangleAlert,
  UserLock,
  UserRound,
  UserRoundX,
  UsersIcon,
} from 'lucide-react';
import { FaGithub, FaGoogle, FaOpenid, FaUserLock } from 'react-icons/fa';
import { IconType } from 'react-icons/lib';
import { useMutation, type UseQueryExecute } from 'urql';
import { useDebouncedCallback } from 'use-debounce';
import { Badge } from '@/components/base/badge/badge';
import { CopyChip } from '@/components/base/copy-chip/copy-chip';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Popover } from '@/components/base/floating/popover/popover';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { Input } from '@/components/base/input/input';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Button } from '@/components/ui/button';
import { Callout } from '@/components/ui/callout';
import { KeyIcon } from '@/components/ui/icon';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import * as Sheet from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { cn } from '@/lib/utils';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { organizationMembersRoute } from '../../../router';
import { MemberInvitationButton } from './invitations';
import { MemberRolePicker } from './member-role-picker';

const MemberGroups_GroupFragment = graphql(`
  fragment MemberGroups_GroupFragment on Group {
    id
    name
  }
`);

function MemberGroups(props: { groups: Array<FragmentType<typeof MemberGroups_GroupFragment>> }) {
  const groups = useFragment(MemberGroups_GroupFragment, props.groups);
  // Show first 2 groups, then +N more
  const visibleGroups = groups.slice(0, 2);
  const remainingCount = groups.length - 2;

  if (groups.length === 0) {
    return (
      <Tooltip
        trigger={
          <div className="flex w-fit items-center gap-1.5">
            <UsersIcon className="h-3.5 w-3.5" />
            <span className="text-xs">Groups: none</span>
          </div>
        }
        content="Groups can be assigned via the SCIM provider."
      />
    );
  }

  return (
    <div className="flex w-fit items-center gap-2">
      <div className="flex items-center gap-1.5">
        <UsersIcon className="h-3.5 w-3.5" />
        <span className="text-xs">Groups:</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {visibleGroups.map(group => (
          <Badge key={group.id} content={group.name} />
        ))}
        {remainingCount > 0 && (
          <Popover
            trigger={
              <button type="button" aria-label="All groups">
                <Badge variants={{ variant: 'outline' }} content={`+${remainingCount} more`} />
              </button>
            }
            openOnHover
            side="top"
            width="auto"
            content={
              <ul className="space-y-1 text-left">
                {groups.slice(2).map(group => (
                  <li key={group.id}>
                    <Badge content={group.name} />
                  </li>
                ))}
              </ul>
            }
          />
        )}
      </div>
    </div>
  );
}

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
      }
    }
  }
`);

const OrganizationMemberRow_ConfirmSCIMManagementForMember = graphql(`
  mutation OrganizationMemberRow_ConfirmSCIMManagementForMember(
    $input: ConfirmSCIMManagementForMemberInput!
  ) {
    confirmSCIMManagementForMember(input: $input) {
      ok {
        confirmedMember {
          id
          ...OrganizationMemberRow_MemberFragment
        }
      }
      error {
        message
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
      provisionInfo {
        isDisabled
        externalId
        provisioningStatus
      }
    }
    authProviders {
      type
      disabledReason
    }
    role {
      id
    }
    groups {
      id
      ...MemberGroups_GroupFragment
    }
    isOwner
    viewerCanRemove
    ...MemberRole_MemberFragment
  }
`);

type MemberRow = DocumentType<typeof OrganizationMemberRow_MemberFragment>;
type MembersOrganization = DocumentType<typeof OrganizationMembers_OrganizationFragment>;

/** Who the account is: a disabled provisioned user, a provisioned user, or a local one. */
function MemberStatusIcon({ member }: { member: MemberRow }) {
  const info = member.user.provisionInfo;
  if (info?.provisioningStatus === GraphQLSchema.ProvisioningStatus.Active && info.isDisabled) {
    return (
      <span
        className="bg-critical_10 text-critical flex size-9 items-center justify-center rounded-full"
        aria-label="Disabled user"
      >
        <UserRoundX className="size-5" />
      </span>
    );
  }
  const Icon = info ? UserLock : UserRound;
  return (
    <span
      className="bg-neutral-3 flex size-9 items-center justify-center rounded-full"
      aria-label={info ? 'Provisioned user' : 'User'}
    >
      <Icon className="size-5" />
    </span>
  );
}

function MemberNameCell({ member }: { member: MemberRow }) {
  return (
    <DataTableCell
      kind="avatar"
      name={member.user.displayName}
      strikethrough={!!member.user.provisionInfo?.isDisabled}
      trailing={
        <span className="inline-flex items-center gap-1">
          {member.user.provisionInfo ? (
            <Popover
              trigger={
                <button type="button" aria-label="Provisioning details" className="inline-flex">
                  <ShieldCheck className="size-4" />
                </button>
              }
              openOnHover
              width="auto"
              content={
                <div className="text-neutral-11 text-xs">
                  <div>Provisioned via SCIM</div>
                  <div>
                    External ID:{' '}
                    <span className="font-mono">
                      <CopyChip value={member.user.provisionInfo.externalId} />
                    </span>
                  </div>
                </div>
              }
            />
          ) : null}
          {member.authProviders.map(provider => {
            const providerDisplay = authProviderToIconAndTextMap[provider.type];
            return (
              <Tooltip
                key={provider.type}
                trigger={
                  <span className="inline-flex">
                    <providerDisplay.Icon
                      className={cn('size-4', provider.disabledReason && 'text-neutral-7')}
                    />
                  </span>
                }
                content={
                  provider.disabledReason
                    ? `${providerDisplay.text} (Disabled - ${provider.disabledReason})`
                    : providerDisplay.text
                }
              />
            );
          })}
        </span>
      }
    />
  );
}

function MemberRoleCell(props: {
  member: MemberRow;
  organization: MembersOrganization;
  refetchMembers: UseQueryExecute;
}) {
  const { member, organization } = props;
  const { toast } = useToast();
  const [scimOpen, setScimOpen] = useState(false);
  const [confirmManagementState, confirmManagement] = useMutation(
    OrganizationMemberRow_ConfirmSCIMManagementForMember,
  );

  if (member.isOwner) {
    return (
      <DataTableCell
        kind="text"
        value="Owner"
        weight="medium"
        trailing={
          <Tooltip
            trigger={
              <button
                type="button"
                aria-label="About the owner role"
                className="text-neutral-9 hover:text-neutral-11 inline-flex"
              >
                <Info className="size-3.5" />
              </button>
            }
            content="The organization owner has full access to everything within the organization. The role of the owner can not be changed."
          />
        }
      />
    );
  }

  if (member.user.provisionInfo?.provisioningStatus === GraphQLSchema.ProvisioningStatus.Active) {
    return member.user.provisionInfo.isDisabled ? (
      <Tooltip
        trigger={
          <span className="inline-flex">
            <DataTableCell kind="badge" items={{ content: 'Disabled', variant: 'critical' }} />
          </span>
        }
        content="This user is disabled."
      />
    ) : (
      <div className="ml-auto mr-0 w-fit">
        <MemberGroups groups={member.groups ?? []} />
      </div>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      {member.viewerCanRemove &&
        member.user.provisionInfo?.provisioningStatus ===
          GraphQLSchema.ProvisioningStatus.PendingConfirmation && (
          <AlertDialog
            open={scimOpen}
            onOpenChange={setScimOpen}
            trigger={
              <Button type="button" size="xs" variant="orangeLink">
                <TriangleAlert className="mr-1 size-3" />
                SCIM matched this existing account
              </Button>
            }
            title={`Allow SCIM to manage ${member.user.displayName}?`}
            description={
              <>
                SCIM matched <strong>{member.user.email}</strong> to an existing organization
                member.
              </>
            }
            confirm={{
              label: confirmManagementState.fetching ? 'Applying...' : 'Allow SCIM management',
              variant: 'destructive',
              disabled: confirmManagementState.fetching,
              onClick: async () => {
                try {
                  const result = await confirmManagement({
                    input: {
                      organization: { byId: organization.id },
                      member: { byId: member.user.id },
                    },
                  });

                  if (result.error) {
                    toast({
                      variant: 'destructive',
                      title: 'Could not enable SCIM management',
                      description: result.error.message,
                    });
                  } else if (result.data?.confirmSCIMManagementForMember.error) {
                    toast({
                      variant: 'destructive',
                      title: 'Could not enable SCIM management',
                      description: result.data.confirmSCIMManagementForMember.error.message,
                    });
                  } else if (result.data?.confirmSCIMManagementForMember.ok) {
                    toast({
                      title: 'SCIM management enabled',
                      description: `${member.user.email} is now managed through SCIM.`,
                    });
                    setScimOpen(false);
                    props.refetchMembers({ requestPolicy: 'network-only' });
                  }
                } catch (error) {
                  console.error(error);
                  toast({
                    variant: 'destructive',
                    title: 'Could not enable SCIM management',
                    description: error instanceof Error ? error.message : String(error),
                  });
                }
              },
            }}
            cancel={{ disabled: confirmManagementState.fetching }}
          >
            <p className="text-neutral-11 text-sm">
              After confirmation, your identity provider will control this user's status and
              group-based access. Review the pending SCIM values below to avoid removing access
              unintentionally.
            </p>
            <div className="mt-4 space-y-2">
              <div className="text-sm">Pending SCIM values</div>
              <div className="flex w-fit items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <KeyIcon className="h-3.5 w-3.5" />
                  <span className="text-xs">
                    User status: {member.user.provisionInfo.isDisabled ? 'Disabled' : 'Active'}
                  </span>
                </div>
              </div>
              <MemberGroups groups={member.groups ?? []} />
            </div>
          </AlertDialog>
        )}
      <MemberRole member={member} organization={organization} />
    </span>
  );
}

function MemberActionsCell(props: {
  member: MemberRow;
  organization: MembersOrganization;
  refetchMembers: UseQueryExecute;
}) {
  const { member, organization } = props;
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteMemberState, deleteMember] = useMutation(OrganizationMemberRow_DeleteMember);

  if (!member.viewerCanRemove) {
    return null;
  }

  if (member.user.provisionInfo?.provisioningStatus === GraphQLSchema.ProvisioningStatus.Active) {
    return (
      <span className="flex justify-end">
        <Tooltip
          trigger={
            <span className="inline-flex">
              <ShieldCheck size={16} className="text-neutral-8" />
            </span>
          }
          content="Provisioned users can only be updated via the SCIM endpoints."
        />
      </span>
    );
  }

  return (
    <>
      <DataTableCell
        kind="actions"
        label={`Actions for ${member.user.displayName}`}
        sections={[
          [{ label: 'Delete', variant: 'destructiveAction', onClick: () => setOpen(true) }],
        ]}
      />
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Are you absolutely sure?"
        description={
          <>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{member.user.email}</strong> from the organization.
          </>
        }
        confirm={{
          label: deleteMemberState.fetching ? 'Deleting...' : 'Continue',
          variant: 'destructive',
          disabled: deleteMemberState.fetching,
          onClick: async () => {
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
                props.refetchMembers({ requestPolicy: 'network-only' });
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
          },
        }}
        cancel={{ disabled: deleteMemberState.fetching }}
      />
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
    members(
      first: $first
      after: $after
      filters: {
        searchTerm: $searchTerm
        needsSCIMManagementConfirmation: $needsSCIMManagementConfirmation
      }
    ) {
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
  /** The page query is in flight, so the paging bar spins and holds its buttons. */
  loading: boolean;
}) {
  // Pagination state
  const [cursorHistory, setCursorHistory] = useState<Array<string | null>>([null]);
  const [currentPage, setCurrentPage] = useState(0);

  const search = organizationMembersRoute.useSearch();

  const organization = useFragment(OrganizationMembers_OrganizationFragment, props.organization);
  const members = useFragment(
    OrganizationMemberRow_MemberFragment,
    organization.members?.edges?.map(edge => edge.node) ?? [],
  );
  const pageInfo = organization.members?.pageInfo;

  const columns = useMemo<ColumnDef<MemberRow, unknown>[]>(
    () => [
      {
        id: 'status',
        meta: { width: 'xs' },
        cell: ({ row }) => <MemberStatusIcon member={row.original} />,
      },
      {
        id: 'member',
        header: 'Member',
        meta: { width: 'fill' },
        cell: ({ row }) => <MemberNameCell member={row.original} />,
      },
      {
        id: 'email',
        cell: ({ row }) => (
          <DataTableCell kind="text" value={row.original.user.email} tone="muted" />
        ),
      },
      {
        id: 'role',
        meta: { align: 'right' },
        cell: ({ row }) => (
          <MemberRoleCell
            member={row.original}
            organization={organization}
            refetchMembers={props.refetchMembers}
          />
        ),
      },
      {
        id: 'actions',
        meta: { width: 'xs' },
        cell: ({ row }) => (
          <MemberActionsCell
            member={row.original}
            organization={organization}
            refetchMembers={props.refetchMembers}
          />
        ),
      },
    ],
    [organization, props.refetchMembers],
  );

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
        sideContent={
          <>
            <div className="w-56">
              <Input
                placeholder="Search by username or email"
                leadingIcon={SearchIcon}
                onChange={handleSearchChange}
                defaultValue={searchValue}
              />
            </div>
            {organization.viewerCanManageInvitations && (
              <MemberInvitationButton
                refetchInvitations={props.refetchMembers}
                organization={organization}
              />
            )}
          </>
        }
      />

      {search.showPendingSCIMManagementConfirmations && (
        <Callout type="warning">
          Showing members with unresolved SCIM provisioning conflicts.{' '}
          <Link
            to="/$organizationSlug/view/members"
            search={{ page: 'list' }}
            params={{ organizationSlug: organization.slug }}
            className="text-neutral-1 hover:text-neutral-8"
          >
            Show all members
          </Link>
        </Callout>
      )}
      <div className="mt-4">
        <DataTable
          data={[...members]}
          columns={columns}
          getRowId={member => member.id}
          rowState={member =>
            member.user.provisionInfo?.isDisabled ? { muted: true, critical: true } : undefined
          }
          emptyMessage={
            search.showPendingSCIMManagementConfirmations ? (
              <span className="flex flex-col items-center gap-2">
                No members with provisioning conflict found
                <Link
                  to="/$organizationSlug/view/members"
                  search={{ page: 'list' }}
                  params={{ organizationSlug: organization.slug }}
                  className="text-accent hover:text-accent/80"
                >
                  Show all members
                </Link>
              </span>
            ) : searchValue ? (
              `No results for "${searchValue}". Try adjusting your search term.`
            ) : (
              'No members found.'
            )
          }
          pagination={{
            kind: 'cursor',
            hasPreviousPage: currentPage > 0,
            hasNextPage: !!pageInfo?.hasNextPage,
            onPrevious: () => {
              handlePreviousPage();
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 0);
            },
            onNext: () => {
              if (pageInfo?.endCursor) {
                handleNextPage(pageInfo.endCursor);
              }
              setTimeout(() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }, 0);
            },
            summary: `Page ${currentPage + 1}${
              searchValue && members.length > 0 ? ` · showing results for "${searchValue}"` : ''
            }`,
            loading: props.loading,
          }}
        />
      </div>
    </SubPageLayout>
  );
}
