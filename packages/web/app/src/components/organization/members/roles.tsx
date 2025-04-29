import { useCallback, useState } from 'react';
import { LockIcon, MoreHorizontalIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { z } from 'zod';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { PermissionSelector } from './permission-selector';
import { SelectedPermissionOverview } from './selected-permission-overview';

export const roleFormSchema = z.object({
  name: z
    .string({
      required_error: 'Required',
    })
    .trim()
    .min(2, 'Too short')
    .max(64, 'Max 64 characters long')
    .refine(
      val => typeof val === 'string' && val.length > 0 && val[0] === val[0].toUpperCase(),
      'Must start with a capital letter',
    )
    .refine(val => val !== 'Viewer' && val !== 'Admin', 'Viewer and Admin are reserved'),
  description: z
    .string({
      required_error: 'Please enter role description',
    })
    .trim()
    .min(2, 'Too short')
    .max(256, 'Description is too long'),
  selectedPermissions: z.array(z.string()),
});

type RoleFormValues = z.infer<typeof roleFormSchema>;

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
    resolver: zodResolver(roleFormSchema),
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
    try {
      const result = await updateMemberRole({
        input: {
          organizationSlug: organization.slug,
          roleId: role.id,
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <DialogContent className="max-w-[960px]">
          <DialogHeader>
            <DialogTitle>Member Role Editor</DialogTitle>
            <DialogDescription>Adjust the permissions of this role.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-row space-x-6">
            <div className="w-72 shrink-0 space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter a name" type="text" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Enter a description" autoComplete="off" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grow">
              <div className="flex h-[400px] flex-col space-y-2">
                <FormLabel>Permissions</FormLabel>
                <div className="overflow-y-auto">
                  <PermissionSelector
                    onSelectedPermissionsChange={onChangeSelectedPermissions}
                    permissionGroups={organization.availableMemberPermissionGroups}
                    selectedPermissionIds={selectedPermissions}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={props.close}>
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={form.handleSubmit(onSubmit)}
              disabled={
                !form.formState.isValid || form.formState.isSubmitting || form.formState.disabled
              }
            >
              {form.formState.isSubmitting ? 'Creating...' : 'Confirm selection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Form>
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
    <DialogContent className="max-w-[960px]">
      <DialogHeader>
        <DialogTitle>Member Role: {role.name}</DialogTitle>
        <DialogDescription>{role.description}</DialogDescription>
      </DialogHeader>
      <div className="grow">
        <div className="flex h-[400px] flex-col space-y-2">
          <div className="overflow-scroll">
            <SelectedPermissionOverview
              showOnlyAllowedPermissions={showOnlyGrantedPermissions}
              activePermissionIds={role.permissions}
              permissionsGroups={organization.availableMemberPermissionGroups}
            />
          </div>
        </div>
      </div>
      <DialogFooter>
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
      </DialogFooter>
    </DialogContent>
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
    resolver: zodResolver(roleFormSchema),
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
          organizationSlug: organization.slug,
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

  return (
    <Form {...form}>
      <form>
        <DialogContent className="max-w-[960px]">
          <DialogHeader>
            <DialogTitle>Member Role Creator</DialogTitle>
            <DialogDescription>
              Create a new role that can be assigned to members of this organization.
            </DialogDescription>
          </DialogHeader>
          {state === 'select' ? (
            <div className="flex flex-row space-x-6">
              <div className="w-72 shrink-0 space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter a name"
                          type="text"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea autoComplete="off" placeholder="Enter a description" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grow">
                <div className="flex h-[400px] flex-col space-y-2">
                  <FormLabel>Permissions</FormLabel>
                  <div className="overflow-y-auto">
                    <PermissionSelector
                      onSelectedPermissionsChange={onChangeSelectedPermissions}
                      permissionGroups={organization.availableMemberPermissionGroups}
                      selectedPermissionIds={selectedPermissions}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[400px] overflow-scroll">
              <SelectedPermissionOverview
                activePermissionIds={Array.from(selectedPermissions)}
                permissionsGroups={organization.availableMemberPermissionGroups}
                showOnlyAllowedPermissions={showOnlyGrantedPermissions}
              />
            </div>
          )}
          <DialogFooter>
            {state === 'select' ? (
              <>
                <Button variant="ghost" onClick={props.close}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  onClick={() => setState('confirm')}
                  disabled={
                    !form.formState.isValid ||
                    form.formState.isSubmitting ||
                    form.formState.disabled
                  }
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
                <Button variant="ghost" onClick={() => setState('select')}>
                  Go back
                </Button>
                <Button
                  type="submit"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={
                    !form.formState.isValid ||
                    form.formState.isSubmitting ||
                    form.formState.disabled
                  }
                >
                  {form.formState.isSubmitting
                    ? 'Creating...'
                    : `Create role "${form.getValues().name}"`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </form>
    </Form>
  );
}

function OrganizationMemberRoleCreateButton(props: {
  organization: FragmentType<typeof OrganizationMemberRoleCreator_OrganizationFragment>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Create a new role</Button>
      </DialogTrigger>
      {open ? (
        <OrganizationMemberRoleCreator
          organization={props.organization}
          close={() => setOpen(false)}
        />
      ) : null}
    </Dialog>
  );
}

const OrganizationMemberRoleRow_MemberRoleFragment = graphql(`
  fragment OrganizationMemberRoleRow_MemberRoleFragment on MemberRole {
    id
    name
    description
    locked
    canDelete
    canUpdate
    membersCount
    permissions
  }
`);

function OrganizationMemberRoleRow(props: {
  organizationSlug: string;
  canChangeOIDCDefaultRole: boolean;
  isOIDCDefaultRole: boolean;
  role: FragmentType<typeof OrganizationMemberRoleRow_MemberRoleFragment>;
  onEdit(role: FragmentType<typeof OrganizationMemberRoleRow_MemberRoleFragment>): void;
  onDelete(role: FragmentType<typeof OrganizationMemberRoleRow_MemberRoleFragment>): void;
  onShow(role: FragmentType<typeof OrganizationMemberRoleRow_MemberRoleFragment>): void;
}) {
  const role = useFragment(OrganizationMemberRoleRow_MemberRoleFragment, props.role);
  return (
    <tr>
      <td className="py-3 text-sm font-medium">
        <div className="flex flex-row items-center">
          <div>{role.name}</div>
          {role.locked ? (
            <div className="ml-2">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger asChild>
                    <LockIcon className="size-4" />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-col items-start gap-y-2 p-2">
                      <div className="font-medium">This role is locked</div>
                      <div className="text-sm text-gray-400">
                        Locked roles are created by the system and cannot be modified or deleted.
                      </div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : null}
          {props.isOIDCDefaultRole ? (
            <div className="ml-2">
              <TooltipProvider>
                <Tooltip delayDuration={100}>
                  <TooltipTrigger>
                    <Badge variant="outline">default</Badge>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <div className="flex flex-col items-start gap-y-2 p-2">
                      <div className="font-medium">Default role for new members</div>
                      <div className="text-sm text-gray-400">
                        <p>New members will be assigned to this role by default.</p>
                        {props.canChangeOIDCDefaultRole ? (
                          <p>
                            You can change it in the{' '}
                            <Link
                              to="/$organizationSlug/view/settings"
                              hash="manage-oidc-integration"
                              params={{
                                organizationSlug: props.organizationSlug,
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
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ) : null}
        </div>
      </td>
      <td className="break-words py-3 text-sm text-gray-400" title={role.description}>
        {role.description}
      </td>
      <td className="py-3 text-center text-sm">
        {role.membersCount} {role.membersCount === 1 ? 'member' : 'members'}
      </td>
      <td className="py-3 text-right text-sm">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="data-[state=open]:bg-muted flex size-8 p-0">
              <MoreHorizontalIcon className="size-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px]">
            <DropdownMenuItem onClick={() => props.onShow(props.role)}>Show</DropdownMenuItem>
            <TooltipProvider>
              <Tooltip delayDuration={200} {...(role.canUpdate ? { open: false } : {})}>
                <TooltipTrigger className="block w-full">
                  <DropdownMenuItem
                    onClick={() => props.onEdit(props.role)}
                    disabled={!role.canUpdate}
                  >
                    Edit
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>
                  {role.canUpdate
                    ? null
                    : "You cannot edit this role as you don't have enough permissions."}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip delayDuration={200} {...(role.canDelete ? { open: false } : {})}>
                <TooltipTrigger className="block w-full">
                  <DropdownMenuItem
                    onClick={() => props.onDelete(props.role)}
                    disabled={!role.canDelete}
                  >
                    Delete
                  </DropdownMenuItem>
                </TooltipTrigger>
                <TooltipContent>
                  {role.canDelete
                    ? null
                    : `You cannot delete this role as ${
                        role.membersCount > 0
                          ? 'it has members.'
                          : "you don't have enough permissions."
                      }`}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
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

  return (
    <>
      <Dialog
        open={!!roleToEdit}
        onOpenChange={isOpen => {
          if (!isOpen) {
            setRoleToEdit(null);
          }
        }}
      >
        {roleToEdit ? (
          <OrganizationMemberRoleEditor
            organization={organization}
            role={roleToEdit}
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
      >
        {roleToShow ? (
          <OrganizationMemberRoleView
            organization={organization}
            role={roleToShow}
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
      >
        {roleToDelete ? (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete{' '}
                <strong>{roleToDelete.name}</strong> from the organization.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleteRoleState.fetching}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteRoleState.fetching}
                onClick={async event => {
                  event.preventDefault();

                  try {
                    const result = await deleteRole({
                      input: {
                        organizationSlug: organization.slug,
                        roleId: roleToDelete.id,
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
                }}
              >
                {deleteRoleState.fetching ? 'Deleting...' : 'Continue'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
      <SubPageLayout>
        <SubPageLayoutHeader
          subPageTitle="List of roles"
          description="Manage the roles that can be assigned to members of this organization."
        >
          <OrganizationMemberRoleCreateButton organization={organization} />
        </SubPageLayoutHeader>
        <table className="w-full table-auto divide-y-[1px] divide-gray-500/20">
          <thead>
            <tr>
              <th className="min-w-[200px] py-3 text-left text-sm font-semibold">Name</th>
              <th className="py-3 text-left text-sm font-semibold">Description</th>
              <th className="min-w-[150px] py-3 text-center text-sm font-semibold">Members</th>
              <th className="w-12 py-3 text-right text-sm font-semibold" />
            </tr>
          </thead>
          <tbody className="divide-y-[1px] divide-gray-500/20">
            {organization.memberRoles?.edges.map(({ node: role }) => (
              <OrganizationMemberRoleRow
                organizationSlug={organization.slug}
                isOIDCDefaultRole={organization.oidcIntegration?.defaultMemberRole?.id === role.id}
                canChangeOIDCDefaultRole={organization.me.role?.name === 'Admin'}
                key={role.id}
                role={role}
                onEdit={() => setRoleToEdit(role)}
                onDelete={() => setRoleToDelete(role)}
                onShow={() => setRoleToShow(role)}
              />
            ))}
          </tbody>
        </table>
      </SubPageLayout>
    </>
  );
}
