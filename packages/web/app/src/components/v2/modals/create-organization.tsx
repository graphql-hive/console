import { ReactElement } from 'react';
import { useRouter } from 'next/router';
import { gql } from '@urql/core';
import { useFormik } from 'formik';
import { useMutation } from 'urql';
import * as Yup from 'yup';

import { Button, Heading, Input, Modal } from '@/components/v2';

const CreateOrganizationMutation = gql(/* GraphQL */ `
  mutation CreateOrganizationMutation($input: CreateOrganizationInput!) {
    createOrganization(input: $input) {
      ok {
        createdOrganizationPayload {
          selector {
            organization
          }
          organization {
            ...OrganizationFields
          }
        }
      }
      error {
        inputErrors {
          name
        }
      }
    }
  }
`);

export const CreateOrganizationModal = ({
  isOpen,
  toggleModalOpen,
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
}): ReactElement => {
  const [mutation, mutate] = useMutation(CreateOrganizationMutation);
  const { push } = useRouter();

  const { handleSubmit, values, handleChange, handleBlur, isSubmitting, errors, touched } = useFormik({
    initialValues: { name: '' },
    validationSchema: Yup.object().shape({
      name: Yup.string().required('Organization name is required'),
    }),
    async onSubmit(values) {
      const mutation = await mutate({
        input: {
          name: values.name,
        },
      });

      if (mutation.data?.createOrganization.ok) {
        toggleModalOpen();
        push(`/${mutation.data.createOrganization.ok.createdOrganizationPayload.organization.cleanId}`);
      }
    },
  });

  return (
    <Modal open={isOpen} onOpenChange={toggleModalOpen}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <Heading className="text-center">Create an organization</Heading>
        <p className="text-sm text-gray-500">
          An organization is built on top of <b>Projects</b>. You will become an <b>admin</b> and don't worry, you can
          add members later.
        </p>
        <Input
          placeholder="Organization name"
          name="name"
          value={values.name}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          isInvalid={touched.name && Boolean(errors.name)}
          className="grow"
        />
        {touched.name && (errors.name || mutation.error) && (
          <div className="-mt-2 text-sm text-red-500">{errors.name || mutation.error?.message}</div>
        )}
        {mutation.data?.createOrganization.error?.inputErrors.name && (
          <div className="-mt-2 text-sm text-red-500">{mutation.data.createOrganization.error.inputErrors.name}</div>
        )}
        <div className="flex gap-2">
          <Button type="button" size="large" block onClick={toggleModalOpen}>
            Cancel
          </Button>
          <Button type="submit" size="large" block variant="primary" disabled={isSubmitting}>
            Create Organization
          </Button>
        </div>
      </form>
    </Modal>
  );
};
