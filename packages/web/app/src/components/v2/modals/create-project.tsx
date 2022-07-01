import { ReactElement } from 'react';
import { useRouter } from 'next/router';
import { useFormik } from 'formik';
import { gql, useMutation } from 'urql';
import * as Yup from 'yup';

import { Button, Heading, Input, Modal, ProjectTypes } from '@/components/v2';
import { ProjectType } from '@/graphql';
import { useRouteSelector } from '@/lib/hooks/use-route-selector';

const CreateProjectMutation = gql(/* GraphQL */ `
  mutation CreateProject_CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      ok {
        selector {
          organization
          project
        }
        createdProject {
          ...ProjectFields
        }
        createdTargets {
          ...TargetFields
        }
      }
      error {
        message
        inputErrors {
          name
          buildUrl
          validationUrl
        }
      }
    }
  }
`);

export const CreateProjectModal = ({
  isOpen,
  toggleModalOpen,
}: {
  isOpen: boolean;
  toggleModalOpen: () => void;
}): ReactElement => {
  const [mutation, mutate] = useMutation(CreateProjectMutation);
  const { push } = useRouter();
  const router = useRouteSelector();

  const { handleSubmit, values, handleChange, handleBlur, isSubmitting, errors, setFieldValue, touched } = useFormik({
    initialValues: {
      name: '',
      type: '' as ProjectType,
      validationUrl: '',
      buildUrl: '',
    },
    validationSchema: Yup.object().shape({
      name: Yup.string().required('Project name is required'),
      type: Yup.mixed().oneOf(Object.values(ProjectType)).required('Project type is required'),
      validationUrl: Yup.string()
        .url()
        .when('type', {
          is: ProjectType.Custom,
          then: Yup.string().required('Validation url is required'),
        }),
      buildUrl: Yup.string()
        .url()
        .when('type', {
          is: ProjectType.Custom,
          then: Yup.string().required('Build url is required'),
        }),
    }),
    async onSubmit(values) {
      const { data } = await mutate({
        input: {
          organization: router.organizationId,
          ...values,
          ...(values.type === ProjectType.Custom
            ? {}
            : {
                buildUrl: null,
                validationUrl: null,
              }),
        },
      });
      if (data?.createProject.ok) {
        toggleModalOpen();
        push(`/${router.organizationId}/${data.createProject.ok.createdProject.cleanId}`);
      }
    },
  });

  return (
    <Modal open={isOpen} onOpenChange={toggleModalOpen} className="w-[650px]">
      <form onSubmit={handleSubmit} className="flex flex-col gap-8">
        <Heading className="text-center">Create a project</Heading>
        <p className="text-sm text-gray-500">
          A project is built on top of <b>Targets</b>, which are just your environments. We will also create a default
          stacks named <b>production</b>, <b>staging</b> and <b>development</b> for you (don't worry, you can change it
          later).
        </p>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="name">
            Give a name for your project
          </label>
          <Input
            placeholder="Project name"
            name="name"
            value={values.name}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            isInvalid={touched.name && Boolean(errors.name)}
            className="grow"
          />
          {touched.name && errors.name && <div className="text-sm text-red-500">{errors.name}</div>}
          {mutation.data?.createProject.error?.inputErrors.name && (
            <div className="text-sm text-red-500">{mutation.data?.createProject.error.inputErrors.name}</div>
          )}
        </div>

        <div className="flex flex-col gap-4">
          <label className="text-sm font-semibold" htmlFor="type">
            Choose project type
          </label>
          <ProjectTypes value={values.type} onValueChange={type => setFieldValue('type', type)} />
          {touched.type && errors.type && <div className="text-sm text-red-500">{errors.type}</div>}
        </div>

        {values.type === ProjectType.Custom && (
          <>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold" htmlFor="validationUrl">
                Validation endpoint
              </label>
              <Input
                placeholder="Where validation should happen"
                name="validationUrl"
                value={values.validationUrl}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                isInvalid={touched.validationUrl && Boolean(errors.validationUrl)}
                className="grow"
              />
              {touched.validationUrl && errors.validationUrl && (
                <div className="text-sm text-red-500">{errors.validationUrl}</div>
              )}
              {mutation.data?.createProject.error?.inputErrors.validationUrl && (
                <div className="text-sm text-red-500">
                  {mutation.data?.createProject.error.inputErrors.validationUrl}
                </div>
              )}
              <p className="text-sm text-gray-500">
                In Custom mode, Hive will ask you to validate GraphQL Schemas.
                <br />A POST request containing schemas will be made to the endpoint above.
              </p>
            </div>
            <div className="flex flex-col gap-4">
              <label className="text-sm font-semibold" htmlFor="buildUrl">
                Schema building endpoint
              </label>
              <Input
                placeholder="Where building should happen"
                name="buildUrl"
                value={values.buildUrl}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                isInvalid={touched.buildUrl && Boolean(errors.buildUrl)}
                className="grow"
              />
              {touched.buildUrl && errors.buildUrl && <div className="text-sm text-red-500">{errors.buildUrl}</div>}
              {mutation.data?.createProject.error?.inputErrors.buildUrl && (
                <div className="text-sm text-red-500">{mutation.data?.createProject.error.inputErrors.buildUrl}</div>
              )}
              <p className="text-sm text-gray-500">
                In Custom mode, Hive will ask you to validate GraphQL Schemas.
                <br />A POST request containing schemas will be made to the endpoint above.
              </p>
            </div>
          </>
        )}

        {mutation.error && <div className="text-sm text-red-500">{mutation.error.message}</div>}
        {mutation.data?.createProject.error && (
          <div className="text-sm text-red-500">{mutation.data.createProject.error.message}</div>
        )}

        <div className="flex gap-2">
          <Button type="button" size="large" block onClick={toggleModalOpen}>
            Cancel
          </Button>
          <Button type="submit" size="large" block variant="primary" disabled={isSubmitting}>
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
};
