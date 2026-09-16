import { useCallback, useState } from 'react';
import { MailIcon, MailQuestionIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { z } from 'zod';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Input } from '@/components/base/input/input';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { useClipboard } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';
import { RoleSelector } from './common';
import {
  ResourceSelection,
  ResourceSelector,
  resourceSlectionToGraphQLSchemaResourceAssignmentInput,
} from './resource-selector';

const MemberInvitationForm_InviteByEmail = graphql(`
  mutation MemberInvitationForm_InviteByEmail($input: InviteToOrganizationByEmailInput!) {
    inviteToOrganizationByEmail(input: $input) {
      ok {
        createdOrganizationInvitation {
          ...Members_Invitation
          email
          id
        }
      }
      error {
        message
        inputErrors {
          email
        }
      }
    }
  }
`);

const MemberInvitationForm_OrganizationFragment = graphql(`
  fragment MemberInvitationForm_OrganizationFragment on Organization {
    id
    slug
    memberRoles {
      edges {
        node {
          id
          name
          description
          isLocked
          canInvite
        }
      }
    }
    ...ResourceSelector_OrganizationFragment
  }
`);

const memberInvitationFormSchema = z.object({
  email: z
    .string({
      required_error: 'Please enter email address',
    })
    .max(128, 'Email address is too long')
    .email('Please enter valid email address'),
  role: z
    .string({
      required_error: 'Please select a role',
    })
    .min(1, 'Please select a role'),
});

type MemberInvitationFormValues = z.infer<typeof memberInvitationFormSchema>;

function MemberInvitationForm(props: {
  organization: FragmentType<typeof MemberInvitationForm_OrganizationFragment>;
  close(): void;
  refetchInvitations(): void;
}) {
  const { toast } = useToast();
  const organization = useFragment(MemberInvitationForm_OrganizationFragment, props.organization);
  const [invitation, invite] = useMutation(MemberInvitationForm_InviteByEmail);
  const viewerRole = organization.memberRoles?.edges.find(
    edge => edge.node.name === 'Viewer',
  )?.node;

  const [selection, setSelection] = useState<ResourceSelection>(() => ({
    mode: GraphQLSchema.ResourceAssignmentModeType.All,
    projects: [],
  }));

  const form = useForm<MemberInvitationFormValues>({
    resolver: zodResolver(memberInvitationFormSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      role: viewerRole?.id ?? '',
    },
    disabled: invitation.fetching,
  });

  if (!viewerRole) {
    console.error('Viewer role not found in organization member roles');
    return (
      <>
        <div className="text-red-500">Viewer role not found in organization member roles</div>
        <div className="text-neutral-10">Please contact support.</div>
      </>
    );
  }

  async function onSubmit(data: MemberInvitationFormValues) {
    try {
      const result = await invite({
        input: {
          organization: {
            bySelector: {
              organizationSlug: organization.slug,
            },
          },
          email: data.email,
          memberRoleId: data.role,
          resources: resourceSlectionToGraphQLSchemaResourceAssignmentInput(selection),
        },
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to send an invitation',
          description: result.error.message,
        });
        return;
      }

      if (result.data?.inviteToOrganizationByEmail?.ok?.createdOrganizationInvitation.email) {
        toast({
          title: 'Invitation sent',
          description: `${result.data.inviteToOrganizationByEmail.ok.createdOrganizationInvitation.email} should receive an invitation email shortly.`,
        });
        form.reset({ email: '', role: '' });
        props.close();
        props.refetchInvitations();
      } else if (result.data?.inviteToOrganizationByEmail?.error?.message) {
        toast({
          variant: 'destructive',
          title: 'Failed to send an invitation',
          description: result.data?.inviteToOrganizationByEmail.error.message,
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to send an invitation',
        description: String(error),
      });
    }
  }

  if (!viewerRole) {
    console.error('Viewer role not found in organization member roles');
    return (
      <>
        <div className="text-red-500">Viewer role not found in organization member roles</div>
        <div className="text-neutral-10">Please contact support.</div>
      </>
    );
  }

  return (
    <Form {...form}>
      <form className="flex flex-col gap-4" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="flex flex-row items-start space-x-6">
          <div className="grow">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="Enter an email"
                      type="email"
                      onSurface="raised"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div>
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RoleSelector
                      roles={organization.memberRoles?.edges.map(edge => edge.node) ?? []}
                      defaultRole={
                        organization.memberRoles?.edges.find(edge => edge.node.id === field.value)
                          ?.node ?? viewerRole
                      }
                      isRoleActive={role => ({
                        active: role.canInvite,
                        reason: role.canInvite ? undefined : 'Not enough permissions',
                      })}
                      onSelect={role => {
                        field.onChange(role.id);
                        field.onBlur();
                      }}
                      onBlur={field.onBlur}
                      disabled={field.disabled}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
        <div>
          <ResourceSelector
            selection={selection}
            onSelectionChange={setSelection}
            organization={organization}
          />
        </div>
        <div className="flex justify-end">
          <Button
            type="submit"
            onClick={form.handleSubmit(onSubmit)}
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            {form.formState.isSubmitting ? 'Sending invitation...' : 'Send invitation'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

export function MemberInvitationButton(props: {
  organization: FragmentType<typeof MemberInvitationForm_OrganizationFragment>;
  refetchInvitations(): void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      trigger={
        <Button className="ml-4 min-w-[140px]" data-cy="send-invite-trigger">
          <MailIcon size={14} className="mr-2" /> Send Invite
        </Button>
      }
      width="xl"
      title="Membership Invitation"
      description="Enter the email address of the person you want to invite and select their role within the organization. Invitation expires after 7 days."
    >
      {/* Keyed on `open` so the form starts fresh each time without remounting the dialog. */}
      <MemberInvitationForm
        key={String(open)}
        refetchInvitations={props.refetchInvitations}
        organization={props.organization}
        close={() => setOpen(false)}
      />
    </Dialog>
  );
}

const InvitationDeleteButton_DeleteInvitation = graphql(`
  mutation InvitationDeleteButton_DeleteInvitation($input: DeleteOrganizationInvitationInput!) {
    deleteOrganizationInvitation(input: $input) {
      ok {
        deletedOrganizationInvitationId
      }
      error {
        message
      }
    }
  }
`);

const Members_Invitation = graphql(`
  fragment Members_Invitation on OrganizationInvitation {
    id
    expiresAt
    email
    code
    role {
      id
      name
    }
  }
`);

type InvitationNode = FragmentType<typeof Members_Invitation>;

function InvitationEmailCell(props: { invitation: InvitationNode }) {
  const invitation = useFragment(Members_Invitation, props.invitation);
  return (
    <DataTableCell
      kind="text"
      value={<span title={invitation.email}>{invitation.email}</span>}
      weight="medium"
      truncate
    />
  );
}

function InvitationRoleCell(props: { invitation: InvitationNode }) {
  const invitation = useFragment(Members_Invitation, props.invitation);
  return <DataTableCell kind="text" value={invitation.role.name} />;
}

function InvitationExpiryCell(props: { invitation: InvitationNode }) {
  const invitation = useFragment(Members_Invitation, props.invitation);
  return <DataTableCell kind="time" date={invitation.expiresAt} mode="absolute" tone="muted" />;
}

/** The row's menu, and the delete confirmation it opens. */
function InvitationActions(props: {
  invitation: InvitationNode;
  organizationSlug: string;
  refetchInvitations(): void;
}) {
  const invitation = useFragment(Members_Invitation, props.invitation);
  const copyToClipboard = useClipboard();
  const copyLink = useCallback(async () => {
    await copyToClipboard(`${window.location.origin}/join/${invitation.code}`);
  }, [invitation.code, copyToClipboard]);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [deleteInvitationState, deleteInvitation] = useMutation(
    InvitationDeleteButton_DeleteInvitation,
  );

  return (
    <>
      <AlertDialog
        open={open}
        onOpenChange={setOpen}
        title="Are you absolutely sure?"
        description={
          <>
            This action cannot be undone. This will permanently delete the invitation for{' '}
            <strong>{invitation.email}</strong>.
          </>
        }
        confirm={{
          label: deleteInvitationState.fetching ? 'Deleting...' : 'Continue',
          disabled: deleteInvitationState.fetching,
          onClick: async () => {
            try {
              const result = await deleteInvitation({
                input: {
                  organization: {
                    bySelector: {
                      organizationSlug: props.organizationSlug,
                    },
                  },
                  email: invitation.email,
                },
              });

              if (result.error) {
                toast({
                  variant: 'destructive',
                  title: 'Failed to delete invitation',
                  description: result.error.message,
                });
              } else if (result.data?.deleteOrganizationInvitation.error) {
                toast({
                  variant: 'destructive',
                  title: 'Failed to delete invitation',
                  description: result.data?.deleteOrganizationInvitation.error.message,
                });
              } else if (result.data?.deleteOrganizationInvitation.ok) {
                toast({
                  title: 'Invitation deleted',
                  description: `Invitation for ${invitation.email} has been deleted.`,
                });
                setOpen(false);
                props.refetchInvitations();
              }
            } catch (error) {
              console.log('Failed to delete invitation');
              console.error(error);
              toast({
                variant: 'destructive',
                title: 'Failed to delete invitation',
                description: String(error),
              });
            }
          },
        }}
        cancel={{ disabled: deleteInvitationState.fetching }}
      />
      <DataTableCell
        kind="actions"
        label={`Actions for ${invitation.email}`}
        sections={[
          [
            { label: 'Copy invitation link', onClick: copyLink },
            {
              label: 'Delete invitation',
              variant: 'destructiveAction',
              onClick: () => setOpen(true),
            },
          ],
        ]}
      />
    </>
  );
}

const OrganizationInvitations_OrganizationFragment = graphql(`
  fragment OrganizationInvitations_OrganizationFragment on Organization {
    id
    slug
    invitations {
      edges {
        node {
          id
          ...Members_Invitation
        }
      }
    }
    ...MemberInvitationForm_OrganizationFragment
  }
`);

export function OrganizationInvitations(props: {
  organization: FragmentType<typeof OrganizationInvitations_OrganizationFragment>;
  refetchInvitations(): void;
}) {
  const organization = useFragment(
    OrganizationInvitations_OrganizationFragment,
    props.organization,
  );

  if (!organization.invitations) {
    return null;
  }

  type InvitationRow = NonNullable<typeof organization.invitations>['edges'][number]['node'];
  const columns: ColumnDef<InvitationRow, unknown>[] = [
    {
      id: 'email',
      header: 'Email',
      meta: { width: 'fill' },
      cell: ({ row }) => <InvitationEmailCell invitation={row.original} />,
    },
    {
      id: 'role',
      header: 'Assigned role',
      meta: { align: 'center', width: 'md' },
      cell: ({ row }) => <InvitationRoleCell invitation={row.original} />,
    },
    {
      id: 'expiresAt',
      header: 'Expiration date',
      meta: { align: 'center', width: 'md' },
      cell: ({ row }) => <InvitationExpiryCell invitation={row.original} />,
    },
    {
      id: 'actions',
      meta: { width: 'xs' },
      cell: ({ row }) => (
        <InvitationActions
          invitation={row.original}
          organizationSlug={organization.slug}
          refetchInvitations={props.refetchInvitations}
        />
      ),
    },
  ];

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Member Invitations"
        description={
          <>
            <p>
              Send an invite to add a new non-OIDC member to your Organization. Invitations expire
              after 7 days.
            </p>
            <p>To accept, the user must have an account and log in before using the sent link.</p>
          </>
        }
        sideContent={
          <MemberInvitationButton
            refetchInvitations={props.refetchInvitations}
            organization={organization}
          />
        }
      />
      {organization.invitations.edges.length > 0 ? (
        <DataTable
          data={organization.invitations.edges.map(edge => edge.node)}
          columns={columns}
          getRowId={invitation => invitation.id}
          pagination={{ kind: 'none' }}
        />
      ) : (
        <div className="flex h-[250px] shrink-0 items-center justify-center rounded-md border border-dashed">
          <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
            <MailQuestionIcon className="text-neutral-10 size-10" />

            <h3 className="mt-4 text-lg font-semibold">No invitations</h3>
            <p className="text-neutral-10 mb-4 mt-2 text-sm">
              Invitations to join this organization will appear here.
            </p>
          </div>
        </div>
      )}
    </SubPageLayout>
  );
}
