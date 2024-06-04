import { ReactElement, useState } from 'react';
import { useFormik } from 'formik';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
import { PermissionScopeItem, usePermissionsManager } from '@/components/organization/Permissions';
import { Button } from '@/components/ui/button';
import { Accordion, CopyValue, Heading, Input, Modal, Tag } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { TargetAccessScope } from '@/gql/graphql';
import { RegistryAccessScope } from '@/lib/access/common';

export const CreateAccessToken_CreateTokenMutation = graphql(`
  mutation CreateAccessToken_CreateToken($input: CreateTokenInput!) {
    createToken(input: $input) {
      ok {
        selector {
          organization
          project
          target
        }
        createdToken {
          id
          name
          alias
          date
          lastUsedAt
        }
        secret
      }
      error {
        message
      }
    }
  }
`);

const CreateAccessTokenModalQuery = graphql(`
  query CreateAccessTokenModalQuery($organizationId: ID!) {
    organization(selector: { organization: $organizationId }) {
      organization {
        ...CreateAccessTokenModalContent_OrganizationFragment
      }
    }
  }
`);

export function CreateAccessTokenModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationId: string;
  projectId: string;
  targetId: string;
}): ReactElement {
  const { isOpen, toggleModalOpen } = props;
  const [organizationQuery] = useQuery({
    query: CreateAccessTokenModalQuery,
    variables: {
      organizationId: props.organizationId,
    },
  });

  const organization = organizationQuery.data?.organization?.organization;

  return (
    <Modal
      open={isOpen}
      onOpenChange={toggleModalOpen}
      className="flex h-5/6 w-[650px] overflow-hidden"
    >
      {organization ? (
        <ModalContent
          organization={organization}
          organizationId={props.organizationId}
          projectId={props.projectId}
          targetId={props.targetId}
          toggleModalOpen={toggleModalOpen}
        />
      ) : null}
    </Modal>
  );
}

const CreateAccessTokenModalContent_OrganizationFragment = graphql(`
  fragment CreateAccessTokenModalContent_OrganizationFragment on Organization {
    id
    ...UsePermissionManager_OrganizationFragment
    me {
      ...UsePermissionManager_MemberFragment
    }
  }
`);

function getFinalTargetAccessScopes(
  selectedScope: 'no-access' | TargetAccessScope,
): Array<TargetAccessScope> {
  if (selectedScope === 'no-access') {
    return [];
  }
  /** When RegistryWrite got selected, we also need to provide RegistryRead.  */
  if (selectedScope === TargetAccessScope.RegistryWrite) {
    return [TargetAccessScope.RegistryRead, TargetAccessScope.RegistryWrite];
  }
  return [TargetAccessScope.RegistryRead];
}

function ModalContent(props: {
  organization: FragmentType<typeof CreateAccessTokenModalContent_OrganizationFragment>;
  organizationId: string;
  projectId: string;
  targetId: string;
  toggleModalOpen: () => void;
}): ReactElement {
  const organization = useFragment(
    CreateAccessTokenModalContent_OrganizationFragment,
    props.organization,
  );
  const [selectedScope, setSelectedScope] = useState(
    'no-access' as TargetAccessScope | 'no-access',
  );

  const manager = usePermissionsManager({
    onSuccess() {},
    organization,
    member: organization.me,
    passMemberScopes: false,
  });

  const [mutation, mutate] = useMutation(CreateAccessToken_CreateTokenMutation);
  const { handleSubmit, values, handleChange, handleBlur, isSubmitting, errors, touched } =
    useFormik({
      initialValues: { name: '' },
      validationSchema: Yup.object().shape({
        name: Yup.string().required('Must enter description'),
      }),
      async onSubmit(values) {
        await mutate({
          input: {
            organization: props.organizationId,
            project: props.projectId,
            target: props.targetId,
            name: values.name,
            organizationScopes: [],
            projectScopes: [],
            targetScopes: getFinalTargetAccessScopes(selectedScope),
          },
        });
      },
    });

  const noPermissionsSelected = selectedScope === 'no-access';

  return (
    <>
      {mutation.data?.createToken.ok ? (
        <div className="flex grow flex-col gap-5">
          <Heading className="text-center">Token successfully created!</Heading>
          <CopyValue value={mutation.data.createToken.ok.secret} />
          <Tag color="green">
            This is your unique API key and it is non-recoverable. If you lose this key, you will
            need to create a new one.
          </Tag>
          <div className="grow" />
          <Button variant="primary" size="lg" className="ml-auto" onClick={props.toggleModalOpen}>
            Ok, got it!
          </Button>
        </div>
      ) : (
        <form className="flex grow flex-col gap-5" onSubmit={handleSubmit}>
          <div className="shrink-0">
            <div className="flex-none">
              <Heading className="mb-2 text-center">Create an access token</Heading>
              <p className="mb-2 text-sm text-gray-500">
                To access GraphQL Hive, your application or tool needs an active API key.
              </p>

              <Input
                placeholder="Token description"
                name="name"
                value={values.name}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                isInvalid={touched.name && !!errors.name}
                className="w-full"
              />
            </div>
            {touched.name && errors.name && (
              <div className="mt-2 text-sm text-red-500">{errors.name}</div>
            )}
            {mutation.data?.createToken.error && (
              <div className="mt-2 text-sm text-red-500">
                {mutation.data?.createToken.error.message}
              </div>
            )}
          </div>
          <div className="flex flex-1 flex-col overflow-hidden">
            <Accordion defaultValue="Permissions">
              <Accordion.Item value="Permissions">
                <Accordion.Header>Registry & Usage</Accordion.Header>
                <Accordion.Content>
                  <PermissionScopeItem
                    scope={RegistryAccessScope}
                    canManageScope={
                      manager.canAccessTarget(RegistryAccessScope.mapping['read-only']) ||
                      manager.canAccessTarget(RegistryAccessScope.mapping['read-write'])
                    }
                    checkAccess={manager.canAccessTarget}
                    onChange={value => {
                      if (value === 'no-access') {
                        setSelectedScope('no-access');
                        return;
                      }
                      setSelectedScope(value);
                    }}
                    possibleScope={Object.values(RegistryAccessScope.mapping)}
                    initialScope={selectedScope}
                    selectedScope={selectedScope}
                  />
                </Accordion.Content>
              </Accordion.Item>
            </Accordion>
          </div>
          <div className="shrink-0">
            {mutation.error && <div className="text-sm text-red-500">{mutation.error.message}</div>}

            <div className="flex w-full gap-2">
              <Button
                type="button"
                size="lg"
                className="w-full justify-center"
                onClick={props.toggleModalOpen}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="lg"
                className="w-full justify-center"
                variant="primary"
                disabled={isSubmitting || noPermissionsSelected}
              >
                Generate Token
              </Button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
