import { useCallback, useMemo, useState } from 'react';
import { LockIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Badge } from '@/components/base/badge/badge';
import { Button } from '@/components/base/button/button';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Popover } from '@/components/base/floating/popover/popover';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { ScrollArea } from '@/components/base/scroll-area/scroll-area';
import { useToast } from '@/components/base/toast/toast';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { PermissionSelector } from './permission-selector';
import { RoleFields, RoleForm, RoleFormSchema, type RoleFormValues } from './role-form';
import { SelectedPermissionOverview } from './selected-permission-overview';

const OrganizationMemberRoleEditor_UpdateMemberRoleMutation = graphql(`
  mutation OrganizationMemberRoleEditor_UpdateMemberRoleMutation($input: UpdateMemberRoleInput!) {
    updateMemberRole(input: $input) {
      ok {
        updatedRole {
          id
          ...OrganizationMemberRoleRow_MemberRoleFragment
        }
      }
      error {
        message
        inputErrors {
          name
          description
        }
      }
    }
  }
`);

const OrganizationMemberRoleEditor_OrganizationFragment = graphql(`
  fragment OrganizationMemberRoleEditor_OrganizationFragment on Organization {
    id
    slug
    availableMemberPermissionGroups {
      ...PermissionSelector_PermissionGroupsFragment
    }
  }
`);

function OrganizationMemberRoleEditor(props: {
  close(): void;
  role: FragmentType<typeof OrganizationMemberRoleRow_MemberRoleFragment>;
  organization: FragmentType<typeof OrganizationMemberRoleEditor_OrganizationFragment>;
}) {
  const role = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, props.role);
  const organization = useFragment(
    OrganizationMemberRoleEditor_OrganizationFragment,
    props.organization,
  );
  const [updateMemberRoleState, updateMemberRole] = useMutation(
    OrganizationMemberRoleEditor_UpdateMemberRoleMutation,
  );
  const { toast } = useToast();
  const isDisabled = updateMemberRoleState.fetching;
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: role.name,
      description: role.description,
      selectedPermissions: [...role.permissions],
    },
    disabled: isDisabled,
  });

  const [selectedPermissions, setSelectedPermissions] = useState<ReadonlySet<string>>(
    () => new Set(role.permissions),
  );

  const onChangeSelectedPermissions = useCallback((permissions: ReadonlySet<string>) => {
    setSelectedPermissions(new Set(permissions));
    form.setValue('selectedPermissions', [...permissions]);
  }, []);

  async function onSubmit(data: RoleFormValues) {
    const isValid = await form.trigger();
    if (!isValid) {
      return;
    }
    try {
      const result = await updateMemberRole({
        input: {
          memberRole: {
            byId: role.id,
          },
          name: data.name,
          description: data.description,
          selectedPermissions: data.selectedPermissions,
        },
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to update the member role',
          description: result.error.message,
        });
      } else if (result.data?.updateMemberRole.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to update member role',
          description: result.data.updateMemberRole.error.message,
        });
        if (result.data.updateMemberRole.error.inputErrors?.name) {
          form.setError('name', {
            message: result.data.updateMemberRole.error.inputErrors.name,
          });
        }
        if (result.data.updateMemberRole.error.inputErrors?.description) {
          form.setError('description', {
            message: result.data.updateMemberRole.error.inputErrors.description,
          });
        }
      } else if (result.data?.updateMemberRole.ok) {
        toast({
          title: 'Member role updated',
        });
        props.close();
      }
    } catch (err) {
      console.log('Failed to update the member role');
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to update the member role',
        description: String(err),
      });
    }
  }

  return (
    <RoleForm
      form={form}
      onSubmit={onSubmit}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={props.close}>
            Cancel
          </Button>
          <Button
            type="submit"
            onSurface="raised"
            disabled={form.formState.isSubmitting || form.formState.disabled}
          >
            {form.formState.isSubmitting ? 'Creating...' : 'Confirm selection'}
          </Button>
        </>
      }
    >
      <RoleFields
        form={form}
        permissions={
          <PermissionSelector
            onSurface="raised"
            onSelectedPermissionsChange={onChangeSelectedPermissions}
            permissionGroups={organization.availableMemberPermissionGroups}
            selectedPermissionIds={selectedPermissions}
          />
        }
      />
    </RoleForm>
  );
}

const OrganizationMemberRoleView_OrganizationFragment = graphql(`
  fragment OrganizationMemberRoleView_OrganizationFragment on Organization {
    id
    availableMemberPermissionGroups {
      ...SelectedPermissionOverview_PermissionGroupFragment
    }
  }
`);

function OrganizationMemberRoleView(props: {
  role: FragmentType<typeof OrganizationMemberRoleRow_MemberRoleFragment>;
  organization: FragmentType<typeof OrganizationMemberRoleView_OrganizationFragment>;
  close: VoidFunction;
}) {
  const role = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, props.role);
  const organization = useFragment(
    OrganizationMemberRoleView_OrganizationFragment,
    props.organization,
  );

  const [showOnlyGrantedPermissions, setShowOnlyGrantedPermissions] = useState(true);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex h-[400px] flex-col space-y-2">
        <ScrollArea fill>
          <SelectedPermissionOverview
            showOnlyAllowedPermissions={showOnlyGrantedPermissions}
            activePermissionIds={role.permissions}
            permissionsGroups={organization.availableMemberPermissionGroups}
          />
        </ScrollArea>
      </div>
      <div className="flex items-center justify-end gap-2">
        <div className="mr-2 flex items-center space-x-2">
          <Checkbox
            id="show-only-granted-permissions"
            checked={showOnlyGrantedPermissions}
            onCheckedChange={value => setShowOnlyGrantedPermissions(!!value)}
          />
          <label
            htmlFor="show-only-granted-permissions"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show only granted permissions
          </label>
        </div>
        <Button variant="ghost" onClick={props.close}>
          Close
        </Button>
      </div>
    </div>
  );
}

const OrganizationMemberRoleCreator_CreateMemberRoleMutation = graphql(`
  mutation OrganizationMemberRoleCreator_CreateMemberRoleMutation($input: CreateMemberRoleInput!) {
    createMemberRole(input: $input) {
      ok {
        updatedOrganization {
          id
          memberRoles {
            edges {
              node {
                id
                ...OrganizationMemberRoleRow_MemberRoleFragment
              }
            }
          }
        }
      }
      error {
        message
        inputErrors {
          name
          description
        }
      }
    }
  }
`);

const OrganizationMemberRoleCreator_OrganizationFragment = graphql(`
  fragment OrganizationMemberRoleCreator_OrganizationFragment on Organization {
    id
    slug
    availableMemberPermissionGroups {
      ...PermissionSelector_PermissionGroupsFragment
    }
    availableMemberPermissionGroups {
      ...SelectedPermissionOverview_PermissionGroupFragment
    }
  }
`);

function OrganizationMemberRoleCreator(props: {
  close(): void;
  organization: FragmentType<typeof OrganizationMemberRoleCreator_OrganizationFragment>;
}) {
  const organization = useFragment(
    OrganizationMemberRoleCreator_OrganizationFragment,
    props.organization,
  );
  const [createMemberRoleState, createMemberRole] = useMutation(
    OrganizationMemberRoleCreator_CreateMemberRoleMutation,
  );
  const { toast } = useToast();
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(RoleFormSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      selectedPermissions: [],
    },
    disabled: createMemberRoleState.fetching,
  });

  const [selectedPermissions, setSelectedPermissions] = useState(() => new Set<string>());

  const onChangeSelectedPermissions = useCallback((permissions: ReadonlySet<string>) => {
    setSelectedPermissions(new Set(permissions));
    form.setValue('selectedPermissions', [...permissions]);
  }, []);

  const [showOnlyGrantedPermissions, setShowOnlyGrantedPermissions] = useState(true);
  const [state, setState] = useState('select' as 'select' | 'confirm');

  async function onSubmit(data: RoleFormValues) {
    try {
      const result = await createMemberRole({
        input: {
          organization: {
            bySelector: {
              organizationSlug: organization.slug,
            },
          },
          name: data.name,
          description: data.description,
          selectedPermissions: data.selectedPermissions,
        },
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to create member role',
          description: result.error.message,
        });
      } else if (result.data?.createMemberRole.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to create member role',
          description: result.data.createMemberRole.error.message,
        });
        if (result.data.createMemberRole.error.inputErrors?.name) {
          form.setError('name', {
            message: result.data.createMemberRole.error.inputErrors.name,
          });
        }
        if (result.data.createMemberRole.error.inputErrors?.description) {
          form.setError('description', {
            message: result.data.createMemberRole.error.inputErrors.description,
          });
        }
      } else if (result.data?.createMemberRole.ok) {
        toast({
          title: 'Member role created',
        });
        props.close();
      }
    } catch (err) {
      console.log('Failed to create member role');
      console.error(err);
      toast({
        variant: 'destructive',
        title: 'Failed to create member role',
        description: String(err),
      });
    }
  }

  const goToConfirm = () => setState('confirm');

  return (
    // The step buttons are not submit buttons: React reuses a footer button's element across
    // steps, and a click that turns it into a submit button submits the form.
    <RoleForm
      form={form}
      onSubmit={state === 'select' ? goToConfirm : onSubmit}
      footer={
        state === 'select' ? (
          <>
            <Button type="button" variant="ghost" onClick={props.close}>
              Cancel
            </Button>
            <Button
              type="button"
              onSurface="raised"
              onClick={form.handleSubmit(goToConfirm)}
              disabled={form.formState.isSubmitting || form.formState.disabled}
            >
              Confirm selection
            </Button>
          </>
        ) : (
          <>
            <div className="mr-2 flex items-center space-x-2">
              <Checkbox
                id="show-only-granted-permissions"
                checked={showOnlyGrantedPermissions}
                onCheckedChange={value => setShowOnlyGrantedPermissions(!!value)}
              />
              <label
                htmlFor="show-only-granted-permissions"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Show only granted permissions
              </label>
            </div>
            <Button type="button" variant="ghost" onClick={() => setState('select')}>
              Go back
            </Button>
            <Button
              type="button"
              onSurface="raised"
              onClick={form.handleSubmit(onSubmit)}
              disabled={form.formState.isSubmitting || form.formState.disabled}
            >
              {form.formState.isSubmitting
                ? 'Creating...'
                : `Create role "${form.getValues().name}"`}
            </Button>
          </>
        )
      }
    >
      {state === 'select' ? (
        <RoleFields
          form={form}
          permissions={
            <PermissionSelector
              onSurface="raised"
              onSelectedPermissionsChange={onChangeSelectedPermissions}
              permissionGroups={organization.availableMemberPermissionGroups}
              selectedPermissionIds={selectedPermissions}
            />
          }
        />
      ) : (
        <div className="flex h-[400px] flex-col">
          <ScrollArea fill>
            <SelectedPermissionOverview
              activePermissionIds={Array.from(selectedPermissions)}
              permissionsGroups={organization.availableMemberPermissionGroups}
              showOnlyAllowedPermissions={showOnlyGrantedPermissions}
            />
          </ScrollArea>
        </div>
      )}
    </RoleForm>
  );
}

function OrganizationMemberRoleCreateButton(props: {
  organization: FragmentType<typeof OrganizationMemberRoleCreator_OrganizationFragment>;
}) {
  const [open, setOpen] = useState(false);
  // Bumped on each open so the creator starts fresh without remounting the dialog.
  const [session, setSession] = useState(0);

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (next) {
          setSession(s => s + 1);
        }
        setOpen(next);
      }}
      trigger={<Button>Create a new role</Button>}
      width="xl"
      title="Member Role Creator"
      description="Create a new role that can be assigned to members of this organization."
    >
      <OrganizationMemberRoleCreator
        key={session}
        organization={props.organization}
        close={() => setOpen(false)}
      />
    </Dialog>
  );
}

const OrganizationMemberRoleRow_MemberRoleFragment = graphql(`
  fragment OrganizationMemberRoleRow_MemberRoleFragment on MemberRole {
    id
    name
    description
    isLocked
    canDelete
    canUpdate
    membersCount
    permissions
  }
`);

type RoleNode = FragmentType<typeof OrganizationMemberRoleRow_MemberRoleFragment>;

function RoleNameCell(props: {
  role: RoleNode;
  isOIDCDefaultRole: boolean;
  canChangeOIDCDefaultRole: boolean;
}) {
  const { organizationSlug } = useSlugs('organization');
  const role = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, props.role);
  const trailing =
    role.isLocked || props.isOIDCDefaultRole ? (
      <>
        {role.isLocked ? (
          <Tooltip
            trigger={
              <span className="inline-flex">
                <LockIcon className="size-4" />
              </span>
            }
            side="right"
            content={
              <div className="flex flex-col items-start gap-y-1 p-2">
                <div className="text-xs font-medium">This role is locked</div>
                <div className="text-neutral-10 text-xs">
                  Locked roles are created by the system and cannot be modified or deleted.
                </div>
              </div>
            }
          />
        ) : null}
        {props.isOIDCDefaultRole ? (
          <Popover
            trigger={
              <button type="button" aria-label="About the default role">
                <Badge content="default" variants={{ variant: 'outline' }} />
              </button>
            }
            openOnHover
            side="right"
            content={
              <div className="flex flex-col items-start gap-y-2">
                <div className="font-medium">Default role for new members</div>
                <div className="text-neutral-10 text-sm">
                  <p>New members will be assigned to this role by default.</p>
                  {props.canChangeOIDCDefaultRole ? (
                    <p>
                      You can change it in the{' '}
                      <Link
                        to="/$organizationSlug/view/settings"
                        hash="manage-oidc-integration"
                        params={{
                          organizationSlug,
                        }}
                        className="underline"
                      >
                        OIDC settings
                      </Link>
                      .
                    </p>
                  ) : (
                    <p>Only admins can change it in the OIDC settings.</p>
                  )}
                </div>
              </div>
            }
          />
        ) : null}
      </>
    ) : undefined;
  return <DataTableCell kind="text" value={role.name} weight="medium" trailing={trailing} />;
}

function RoleDescriptionCell(props: { role: RoleNode }) {
  const role = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, props.role);
  return (
    <DataTableCell
      kind="text"
      value={<span title={role.description}>{role.description}</span>}
      tone="muted"
      truncate
    />
  );
}

function RoleMembersCell(props: { role: RoleNode }) {
  const role = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, props.role);
  return (
    <DataTableCell
      kind="text"
      value={`${role.membersCount} ${role.membersCount === 1 ? 'member' : 'members'}`}
    />
  );
}

function RoleActionsCell(props: {
  role: RoleNode;
  onShow(): void;
  onEdit(): void;
  onDelete(): void;
}) {
  const role = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, props.role);
  return (
    <DataTableCell
      kind="actions"
      label={`Actions for ${role.name}`}
      sections={[
        [
          { label: 'Show', onClick: props.onShow },
          {
            label: 'Edit',
            onClick: props.onEdit,
            disabled: !role.canUpdate,
            // Only set when it applies, so an allowed row gets no tooltip wrapper at all.
            tooltip: role.canUpdate
              ? undefined
              : "You cannot edit this role as you don't have enough permissions.",
          },
          {
            label: 'Delete',
            variant: 'destructiveAction',
            onClick: props.onDelete,
            disabled: !role.canDelete,
            tooltip: role.canDelete
              ? undefined
              : `You cannot delete this role as ${
                  role.membersCount > 0 ? 'it has members.' : "you don't have enough permissions."
                }`,
          },
        ],
      ]}
    />
  );
}

const OrganizationMemberRoles_DeleteMemberRole = graphql(`
  mutation OrganizationMemberRoles_DeleteMemberRole($input: DeleteMemberRoleInput!) {
    deleteMemberRole(input: $input) {
      ok {
        updatedOrganization {
          id
          memberRoles {
            edges {
              node {
                id
                name
                ...OrganizationMemberRoleRow_MemberRoleFragment
              }
            }
          }
          invitations {
            edges {
              node {
                id
                role {
                  id
                }
              }
            }
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const OrganizationMemberRoles_OrganizationFragment = graphql(`
  fragment OrganizationMemberRoles_OrganizationFragment on Organization {
    id
    slug
    memberRoles {
      edges {
        node {
          id
          name
          ...OrganizationMemberRoleRow_MemberRoleFragment
        }
      }
    }
    me {
      id
      role {
        id
        name
      }
    }
    oidcIntegration {
      id
      defaultMemberRole {
        id
      }
    }
    ...OrganizationMemberRoleCreator_OrganizationFragment
    ...OrganizationMemberRoleEditor_OrganizationFragment
    ...OrganizationMemberRoleView_OrganizationFragment
  }
`);

export function OrganizationMemberRoles(props: {
  organization: FragmentType<typeof OrganizationMemberRoles_OrganizationFragment>;
}) {
  const { toast } = useToast();
  const organization = useFragment(
    OrganizationMemberRoles_OrganizationFragment,
    props.organization,
  );

  type Role =
    | Exclude<typeof organization.memberRoles, null | undefined>['edges'][number]['node']
    | null;

  const [deleteRoleState, deleteRole] = useMutation(OrganizationMemberRoles_DeleteMemberRole);
  const [roleToEdit, setRoleToEdit] = useState<Role | null>(null);
  const [roleToShow, setRoleToShow] = useState<Role | null>(null);
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null);
  // Each dialog keeps its last role while it closes, so the exit transition is not empty, and a
  // session counter remounts the editor and viewer on every open so they start from the role.
  const editRole = useKeepPreviousData(roleToEdit ?? undefined, roleToEdit === null);
  const showRole = useKeepPreviousData(roleToShow ?? undefined, roleToShow === null);
  const showRoleHeader = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, showRole);
  const deleteTarget = useKeepPreviousData(roleToDelete ?? undefined, roleToDelete === null);
  const [session, setSession] = useState(0);
  const openFor = (set: (role: Role) => void) => (role: Role) => {
    setSession(s => s + 1);
    set(role);
  };

  const defaultMemberRoleId = organization.oidcIntegration?.defaultMemberRole?.id;
  const canChangeOIDCDefaultRole = organization.me?.role?.name === 'Admin';
  const columns = useMemo<ColumnDef<NonNullable<Role>, unknown>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        meta: { width: 'md' },
        cell: ({ row }) => (
          <RoleNameCell
            role={row.original}
            isOIDCDefaultRole={defaultMemberRoleId === row.original.id}
            canChangeOIDCDefaultRole={canChangeOIDCDefaultRole}
          />
        ),
      },
      {
        id: 'description',
        header: 'Description',
        meta: { width: 'fill' },
        cell: ({ row }) => <RoleDescriptionCell role={row.original} />,
      },
      {
        id: 'members',
        header: 'Members',
        meta: { align: 'center', width: 'sm' },
        cell: ({ row }) => <RoleMembersCell role={row.original} />,
      },
      {
        id: 'actions',
        meta: { width: 'xs' },
        cell: ({ row }) => (
          <RoleActionsCell
            role={row.original}
            onShow={() => openFor(setRoleToShow)(row.original)}
            onEdit={() => openFor(setRoleToEdit)(row.original)}
            onDelete={() => setRoleToDelete(row.original)}
          />
        ),
      },
    ],
    [organization.slug, defaultMemberRoleId, canChangeOIDCDefaultRole],
  );

  return (
    <>
      <Dialog
        open={!!roleToEdit}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setRoleToEdit(null);
          }
        }}
        width="xl"
        title="Member Role Editor"
        description="Adjust the permissions of this role."
      >
        {editRole ? (
          <OrganizationMemberRoleEditor
            key={session}
            organization={organization}
            role={editRole}
            close={() => setRoleToEdit(null)}
          />
        ) : null}
      </Dialog>
      <Dialog
        open={!!roleToShow}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setRoleToShow(null);
          }
        }}
        width="xl"
        title={`Member Role: ${showRoleHeader?.name ?? ''}`}
        description={showRoleHeader?.description}
      >
        {showRole ? (
          <OrganizationMemberRoleView
            key={session}
            organization={organization}
            role={showRole}
            close={() => setRoleToShow(null)}
          />
        ) : null}
      </Dialog>
      <AlertDialog
        open={!!roleToDelete}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setRoleToDelete(null);
          }
        }}
        title="Are you absolutely sure?"
        description={
          <>
            This action cannot be undone. This will permanently delete{' '}
            <strong>{deleteTarget?.name}</strong> from the organization.
          </>
        }
        confirm={{
          label: deleteRoleState.fetching ? 'Deleting...' : 'Continue',
          variant: 'destructive',
          disabled: deleteRoleState.fetching,
          onClick: async () => {
            if (!roleToDelete) {
              return;
            }
            try {
              const result = await deleteRole({
                input: {
                  memberRole: {
                    byId: roleToDelete.id,
                  },
                },
              });

              if (result.error) {
                toast({
                  variant: 'destructive',
                  title: 'Failed to delete a role',
                  description: result.error.message,
                });
              } else {
                toast({
                  title: 'Role deleted',
                });
                setRoleToDelete(null);
              }
            } catch (error) {
              console.log('Failed to delete a role');
              console.error(error);
              toast({
                variant: 'destructive',
                title: 'Failed to delete a role',
                description: String(error),
              });
            }
          },
        }}
        cancel={{ disabled: deleteRoleState.fetching }}
      />
      <SubPageLayout>
        <SubPageLayoutHeader
          subPageTitle="List of roles"
          description="Manage the roles that can be assigned to members of this organization."
          sideContent={<OrganizationMemberRoleCreateButton organization={organization} />}
        />
        <DataTable
          data={organization.memberRoles?.edges.map(({ node }) => node) ?? []}
          columns={columns}
          getRowId={role => role.id}
          pagination={{ kind: 'none' }}
          emptyMessage="No roles yet."
        />
      </SubPageLayout>
    </>
  );
}
