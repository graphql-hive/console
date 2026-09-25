import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { Badge } from '@/components/base/badge/badge';
import { Button } from '@/components/base/button/button';
import { Form } from '@/components/base/form/form';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { useToast } from '@/components/base/toast/toast';
import { Heading } from '@/components/ui/heading';
import { defineStepper } from '@/components/ui/stepper';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { PermissionSelector } from '../../members/permission-selector';
import {
  ResourceSelector,
  resourceSlectionToGraphQLSchemaResourceAssignmentInput,
  type ResourceSelection,
} from '../../members/resource-selector';
import { SelectedPermissionOverview } from '../../members/selected-permission-overview';
import {
  AccessTokenFormSchema,
  AccessTokenGeneralStep,
  AccessTokenPermissionsStep,
  type AccessTokenFormValues,
} from './access-token-form';
import { permissionLevelToResourceName, resolveResources } from './shared-helpers';

const CreateAccessTokenSheetContent_OrganizationFragment = graphql(`
  fragment CreateAccessTokenSheetContent_OrganizationFragment on Organization {
    id
    slug
    availableOrganizationAccessTokenPermissionGroups {
      ...PermissionSelector_PermissionGroupsFragment
      ...SelectedPermissionOverview_PermissionGroupFragment
    }
    ...ResourceSelector_OrganizationFragment
  }
`);

type CreateAccessTokenSheetContentProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenChangeComplete: (open: boolean) => void;
  /** Called with the new token's key; the caller closes the sheet and shows the key. */
  onSuccess: (privateAccessKey: string) => void;
  organization: FragmentType<typeof CreateAccessTokenSheetContent_OrganizationFragment>;
};

const CreateAccessTokenSheetContent_CreateOrganizationAccessTokenMutation = graphql(`
  mutation CreateAccessTokenSheetContent_CreateOrganizationAccessTokenMutation(
    $input: CreateOrganizationAccessTokenInput!
  ) {
    createOrganizationAccessToken(input: $input) {
      ok {
        privateAccessKey
        createdOrganizationAccessToken {
          id
        }
      }
      error {
        message
        details {
          title
          description
        }
      }
    }
  }
`);

export function CreateAccessTokenSheetContent(
  props: CreateAccessTokenSheetContentProps,
): React.ReactNode {
  // eslint-disable-next-line react/hook-use-state
  const [Stepper] = useState(() =>
    defineStepper(
      {
        id: 'step-1-general',
        title: 'General',
      },
      {
        id: 'step-2-permissions',
        title: 'Permissions',
      },
      {
        id: 'step-3-resources',
        title: 'Resources',
      },
      {
        id: 'step-4-confirmation',
        title: 'Confirm',
      },
    ),
  );
  const organization = useFragment(
    CreateAccessTokenSheetContent_OrganizationFragment,
    props.organization,
  );
  const [resourceSelection, setResourceSelection] = useState<ResourceSelection>(() => ({
    mode: GraphQLSchema.ResourceAssignmentModeType.All,
    projects: [],
  }));

  const form = useForm<AccessTokenFormValues>({
    mode: 'onChange',
    resolver: zodResolver(AccessTokenFormSchema),
    defaultValues: {
      title: '',
      description: '',
      permissions: [],
      expirationPeriod: GraphQLSchema.TokenExpirationPeriod.Never,
    },
  });

  const [createOrganizationAccessTokenState, createOrganizationAccessToken] = useMutation(
    CreateAccessTokenSheetContent_CreateOrganizationAccessTokenMutation,
  );

  const resolvedResources = useMemo(
    () => resolveResources(organization.slug, resourceSelection),
    [resourceSelection],
  );

  const { toast } = useToast();
  async function createAccessToken() {
    const formValues = form.getValues();
    const result = await createOrganizationAccessToken({
      input: {
        organization: {
          byId: organization.id,
        },
        title: formValues.title ?? '',
        description: formValues.description ?? '',
        permissions: formValues.permissions,
        resources: resourceSlectionToGraphQLSchemaResourceAssignmentInput(resourceSelection),
        expirationPeriod: formValues.expirationPeriod,
      },
    });

    if (result.data?.createOrganizationAccessToken.error) {
      const { error } = result.data.createOrganizationAccessToken;
      if (error.details?.title) {
        form.setError('title', { message: error.details.title });
      }
      if (error.details?.description) {
        form.setError('description', { message: error.details.description });
      }
      if (error.message) {
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: error.message,
        });
      }
      return;
    }
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'An error occurred',
        description: 'Something went wrong. Try again later.',
      });
      return;
    }
    if (result.data?.createOrganizationAccessToken.ok) {
      props.onSuccess(result.data.createOrganizationAccessToken.ok.privateAccessKey);
    }
  }

  return (
    <Stepper.StepperProvider variant="horizontal">
      {({ stepper }) => (
        <Sheet
          open={props.open}
          onOpenChange={props.onOpenChange}
          onOpenChangeComplete={props.onOpenChangeComplete}
          title="Create Access Token"
          description="Create a new access token with specified permissions and optionally assigned resources."
          footer={
            <Stepper.StepperControls>
              <Button
                variant="outline"
                onClick={stepper.prev}
                disabled={stepper.isFirst || createOrganizationAccessTokenState.fetching}
              >
                Go back
              </Button>
              {stepper.isLast ? (
                <Button
                  onSurface="raised"
                  onClick={
                    createOrganizationAccessTokenState.fetching ? undefined : createAccessToken
                  }
                >
                  {createOrganizationAccessTokenState.fetching
                    ? 'Creating...'
                    : 'Create Access Token'}
                </Button>
              ) : (
                <Button
                  onSurface="raised"
                  onClick={ev => {
                    if (stepper.current.id === 'step-1-general') {
                      void Promise.all([form.trigger('title'), form.trigger('description')]).then(
                        ([title, description]) => {
                          if (!title) {
                            shakeElement(ev);
                            form.setFocus('title');
                            return;
                          }
                          if (!description) {
                            shakeElement(ev);
                            form.setFocus('description');
                            return;
                          }
                          stepper.next();
                        },
                      );
                    }

                    if (stepper.current.id === 'step-2-permissions') {
                      void form.trigger('permissions').then(permissions => {
                        if (!permissions) {
                          shakeElement(ev);
                          return;
                        }

                        stepper.next();
                      });
                    }

                    if (stepper.current.id === 'step-3-resources') {
                      stepper.next();
                    }
                  }}
                >
                  Next
                </Button>
              )}
            </Stepper.StepperControls>
          }
        >
          <Form form={form} onSubmit={() => {}}>
            <Stepper.StepperNavigation>
              {stepper.all.map(step => (
                <Stepper.StepperStep key={step.id} of={step.id} clickable={false}>
                  <Stepper.StepperTitle>{step.title}</Stepper.StepperTitle>
                </Stepper.StepperStep>
              ))}
            </Stepper.StepperNavigation>
            {stepper.switch({
              'step-1-general': () => <AccessTokenGeneralStep form={form} />,
              'step-2-permissions': () => (
                <AccessTokenPermissionsStep form={form}>
                  <PermissionSelector
                    onSurface="raised"
                    permissionGroups={organization.availableOrganizationAccessTokenPermissionGroups}
                    selectedPermissionIds={new Set(form.getValues()['permissions'])}
                    onSelectedPermissionsChange={selectedPermissionIds => {
                      form.setValue('permissions', Array.from(selectedPermissionIds), {
                        shouldValidate: true,
                        shouldTouch: true,
                        shouldDirty: true,
                      });
                    }}
                  />
                </AccessTokenPermissionsStep>
              ),
              'step-3-resources': () => (
                <>
                  <Heading>Resource Access</Heading>
                  <ResourceSelector
                    organization={organization}
                    selection={resourceSelection}
                    onSelectionChange={setResourceSelection}
                  />
                </>
              ),
              'step-4-confirmation': () => (
                <>
                  <Heading>Confirm and create Access Token</Heading>
                  <p className="text-fg-secondary text-sm">
                    Please please review the selected permissions and resources to ensure they align
                    with your intended access needs.
                  </p>
                  {form.getValues().permissions.length === 0 ? (
                    <p className="mt-3">No permissions are selected.</p>
                  ) : (
                    <SelectedPermissionOverview
                      activePermissionIds={form.getValues().permissions}
                      permissionsGroups={
                        organization.availableOrganizationAccessTokenPermissionGroups
                      }
                      showOnlyAllowedPermissions
                      isExpanded
                      additionalGroupContent={group => (
                        <div className="w-full space-y-1">
                          {resolvedResources === null ? (
                            <>Granted on all {permissionLevelToResourceName(group.level)}</>
                          ) : (
                            <>
                              <p className="text-fg-secondary">
                                Granted on {permissionLevelToResourceName(group.level)}:
                              </p>
                              <ul className="flex list-none flex-wrap gap-1">
                                {!resolvedResources[group.level]?.length && (
                                  <li>
                                    <Badge
                                      content={`No ${group.level} selected.`}
                                      variants={{ variant: 'critical', mono: true }}
                                    />
                                  </li>
                                )}
                                {resolvedResources[group.level].map(id => (
                                  <li key={id}>
                                    <Badge
                                      content={id}
                                      variants={{ variant: 'outline', mono: true }}
                                    />
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                        </div>
                      )}
                    />
                  )}
                </>
              ),
            })}
          </Form>
        </Sheet>
      )}
    </Stepper.StepperProvider>
  );
}

function shakeElement(ev: React.MouseEvent<HTMLElement>) {
  const el = ev.target as HTMLElement;
  el.classList.add('animate-shake');
  el.addEventListener(
    'animationend',
    () => {
      el.classList.remove('animate-shake');
    },
    { once: true },
  );
}
