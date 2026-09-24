import { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import {
  TRANSFER_OWNERSHIP_FORM_ID,
  TransferOwnershipForm,
  transferOwnershipFormSchema,
  type TransferOwnershipFormValues,
} from '@/components/organization/settings/transfer-ownership-form';
import { FragmentType, graphql, useFragment } from '@/gql';
import { zodResolver } from '@hookform/resolvers/zod';

const TransferOrganizationOwnership_Request = graphql(`
  mutation TransferOrganizationOwnership_Request($input: RequestOrganizationTransferInput!) {
    requestOrganizationTransfer(input: $input) {
      ok {
        email
      }
      error {
        message
      }
    }
  }
`);

const TransferOrganizationOwnership_Members = graphql(`
  query TransferOrganizationOwnership_Members($selector: OrganizationSelectorInput!) {
    organization(reference: { bySelector: $selector }) {
      id
      slug
      members {
        edges {
          node {
            id
            isOwner
            user {
              id
              fullName
              displayName
              email
            }
          }
        }
      }
    }
  }
`);

export const TransferOrganizationOwnershipModal_OrganizationFragment = graphql(`
  fragment TransferOrganizationOwnershipModal_OrganizationFragment on Organization {
    id
    slug
  }
`);

export const TransferOrganizationOwnershipModal = ({
  isOpen,
  toggleModalOpen,
  onOpenChangeComplete,
  ...props
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  onOpenChangeComplete?: (open: boolean) => void;
  organization: FragmentType<typeof TransferOrganizationOwnershipModal_OrganizationFragment>;
}): ReactElement => {
  const organization = useFragment(
    TransferOrganizationOwnershipModal_OrganizationFragment,
    props.organization,
  );
  const { toast } = useToast();
  const [, mutate] = useMutation(TransferOrganizationOwnership_Request);
  const [query] = useQuery({
    query: TransferOrganizationOwnership_Members,
    variables: {
      selector: {
        organizationSlug: organization.slug,
      },
    },
  });

  const form = useForm<TransferOwnershipFormValues>({
    mode: 'onTouched',
    resolver: zodResolver(transferOwnershipFormSchema(organization.slug)),
    defaultValues: {
      newOwner: '',
      confirmation: '',
    },
  });

  async function onSubmit(values: TransferOwnershipFormValues) {
    const result = await mutate({
      input: {
        organizationSlug: organization.slug,
        userId: values.newOwner,
      },
    });

    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'Failed to transfer ownership',
        description: result.error.message,
      });
    }

    if (result.data?.requestOrganizationTransfer.error?.message) {
      toast({
        variant: 'destructive',
        title: 'Failed to transfer ownership',
        description: result.data.requestOrganizationTransfer.error.message,
      });
    }

    if (result.data?.requestOrganizationTransfer.ok) {
      toast({
        title: 'Ownership transfer requested',
        description: `${result.data.requestOrganizationTransfer.ok.email} has been sent a link to accept it.`,
      });
      form.reset();
      toggleModalOpen();
    }
  }

  const members = (query.data?.organization?.members?.edges ?? [])
    .map(edge => edge.node)
    .filter(member => !member.isOwner)
    .map(member => member.user);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={toggleModalOpen}
      onOpenChangeComplete={onOpenChangeComplete}
      width="xl"
      title="Transfer ownership"
      description="Transferring is completed after the new owner approves the transfer."
      footer={
        <>
          <Button type="button" variant="outline" onClick={toggleModalOpen}>
            Cancel
          </Button>
          <Button
            type="submit"
            form={TRANSFER_OWNERSHIP_FORM_ID}
            onSurface="raised"
            disabled={form.formState.isSubmitting || !form.formState.isValid}
          >
            Transfer this organization
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <TransferOwnershipForm form={form} onSubmit={onSubmit} members={members} />

        <div className="border-neutral-5 h-0 w-full border-t" />

        <div className="font-medium">About the ownership transfer</div>
        <ul className="text-neutral-11 list-inside list-disc px-2 text-sm">
          <li>
            The new owner will receive a confirmation email. If the new owner doesn't accept the
            transfer within 24 hours, the invitation will expire.
          </li>
          <li className="pt-3">
            When you transfer an organization to one of the members, the new owner will get access
            to organization's contents, projects, members, and settings.
          </li>
          <li className="pt-3">
            You will keep your access to the organization's contents, projects, members, and
            settings, except you won't be able to remove the organization.
          </li>
        </ul>
      </div>
    </Dialog>
  );
};
