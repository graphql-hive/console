import { ReactElement } from 'react';
import { useFormik } from 'formik';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import { Select } from '@/components/base/floating/select/select';
import { Input } from '@/components/base/input/input';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { Button } from '@/components/ui/button';
import { FragmentType, graphql, useFragment } from '@/gql';

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

const TransferOrganizationOwnershipModal_OrganizationFragment = graphql(`
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

  const {
    handleSubmit,
    resetForm,
    values,
    handleChange,
    handleBlur,
    isSubmitting,
    isValid,
    errors,
    touched,
    setFieldValue,
    setFieldTouched,
  } = useFormik({
    enableReinitialize: true,
    initialValues: {
      newOwner: '',
      confirmation: '',
    },
    validationSchema: Yup.object().shape({
      newOwner: Yup.string().min(1).required('New owner is not defined'),
      confirmation: Yup.string()
        .min(1)
        .equals([organization.slug])
        .required('Type organization name to confirm'),
    }),
    onSubmit: async values => {
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
        resetForm();
        toggleModalOpen();
      }
    },
  });

  const members = (query.data?.organization?.members?.edges ?? [])
    .map(edge => edge.node)
    .filter(member => !member.isOwner);

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
            disabled={isSubmitting || !isValid || !touched.confirmation || !touched.newOwner}
            onClick={() => handleSubmit()}
          >
            Transfer this organization
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal" htmlFor="newOwner">
            New owner
          </label>
          <Select
            id="newOwner"
            name="newOwner"
            placeholder="Select a member"
            searchable
            searchPlaceholder="Search by name or email..."
            options={members.map(member => ({
              value: member.user.id,
              label: member.user.displayName,
              description: member.user.email,
              keywords: `${member.user.fullName} ${member.user.email}`,
            }))}
            value={values.newOwner}
            // Touched on pick rather than on blur: the popup takes focus when it opens, which
            // would blur the trigger and show "not defined" before anyone has chosen.
            onValueChange={value => {
              void setFieldTouched('newOwner', true, false);
              void setFieldValue('newOwner', value, true);
            }}
            width="full"
            onSurface="raised"
          />
          {touched.newOwner && errors.newOwner && (
            <span className="text-sm text-red-500">{errors.newOwner}</span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-normal" htmlFor="confirmation">
            Type <span className="font-bold">{organization.slug}</span> to confirm.
          </label>

          <Input
            id="confirmation"
            name="confirmation"
            value={values.confirmation}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            invalid={touched.confirmation && !!errors.confirmation}
            onSurface="raised"
          />
        </div>

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
