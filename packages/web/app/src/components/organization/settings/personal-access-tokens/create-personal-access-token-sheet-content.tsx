import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import z from 'zod';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as Form from '@/components/ui/form';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import * as Sheet from '@/components/ui/sheet';
import { defineStepper } from '@/components/ui/stepper';
import * as Tabs from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { PermissionSelector } from '../../members/permission-selector';
import {
  ResourceSelection,
  ResourceSelector,
  resourceSlectionToGraphQLSchemaResourceAssignmentInput,
} from '../../members/resource-selector';
import { SelectedPermissionOverview } from '../../members/selected-permission-overview';
import {
  AcessTokenCreatedConfirmationDialogue,
  DescriptionInputModel,
  shakeElement,
  TitleInputModel,
} from '../access-tokens/create-access-token-sheet-content';
import { permissionLevelToResourceName, resolveResources } from '../access-tokens/shared-helpers';

const CreatePersonalAccessTokenSheetContent_OrganizationFragment = graphql(`
  fragment CreatePersonalAccessTokenSheetContent_OrganizationFragment on Organization {
    id
    slug
    me {
      id
      availablePersonalAccessTokenPermissionGroups {
        ...PermissionSelector_PermissionGroupsFragment
        ...SelectedPermissionOverview_PermissionGroupFragment
      }
    }
    ...ResourceSelector_OrganizationFragment
  }
`);

const CreatePersonalAccessTokenFormModel = z.object({
  title: TitleInputModel,
  description: DescriptionInputModel,
  permissions: z.array(z.string()),
  allowAllPermissionsGrantedToMember: z.boolean(),
});

type CreatePersonalAccessTokenSheetContentProps = {
  onSuccess: () => void;
  organization: FragmentType<typeof CreatePersonalAccessTokenSheetContent_OrganizationFragment>;
};

const CreatePersonalAccessTokenSheetContent_CreateOrganizationAccessTokenMutation = graphql(`
  mutation CreatePersonalAccessTokenSheetContent_CreatePersonalAccessTokenMutation(
    $input: CreatePersonalAccessTokenInput!
  ) {
    createPersonalAccessToken(input: $input) {
      ok {
        privateAccessKey
        createdPersonalAccessToken {
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

export function CreatePersonalAccessTokenSheetContent(
  props: CreatePersonalAccessTokenSheetContentProps,
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
    CreatePersonalAccessTokenSheetContent_OrganizationFragment,
    props.organization,
  );
  const [resourceSelection, setResourceSelection] = useState<ResourceSelection>(() => ({
    mode: GraphQLSchema.ResourceAssignmentModeType.All,
    projects: [],
  }));

  const form = useForm<z.TypeOf<typeof CreatePersonalAccessTokenFormModel>>({
    mode: 'onChange',
    resolver: zodResolver(CreatePersonalAccessTokenFormModel),
    defaultValues: {
      title: '',
      description: '',
      permissions: [],
      allowAllPermissionsGrantedToMember: true,
    },
  });

  const [createPersonalAccessTokenState, createPersonalAccessToken] = useMutation(
    CreatePersonalAccessTokenSheetContent_CreateOrganizationAccessTokenMutation,
  );

  const resolvedResources = useMemo(
    () => resolveResources(organization.slug, resourceSelection),
    [resourceSelection],
  );

  const { toast } = useToast();
  async function createAccessToken() {
    const formValues = form.getValues();

    const result = await createPersonalAccessToken({
      input: {
        organization: {
          byId: organization.id,
        },
        title: formValues.title ?? '',
        description: formValues.description ?? '',
        permissions: formValues.allowAllPermissionsGrantedToMember ? null : formValues.permissions,
        resources: resourceSlectionToGraphQLSchemaResourceAssignmentInput(resourceSelection),
      },
    });

    if (result.data?.createPersonalAccessToken.error) {
      const { error } = result.data.createPersonalAccessToken;
      if (error.details?.title) {
        form.setError('title', { message: error.details.title });
      }
      if (error.details?.description) {
        form.setError('description', { message: error.details.description });
      }
      if (error.message) {
        toast({
          variant: 'destructive',
          title: 'An error occured',
          description: error.message,
        });
      }
      return;
    }
    if (result.error) {
      toast({
        variant: 'destructive',
        title: 'An error occured',
        description: 'Something went wrong. Try again later.',
      });
      return;
    }
  }

  return (
    <Sheet.SheetContent className="flex max-h-screen min-w-[700px] flex-col overflow-y-scroll">
      <Sheet.SheetHeader>
        <Sheet.SheetTitle>Create Personal Access Token</Sheet.SheetTitle>
        <Sheet.SheetDescription>
          Create a new personal access token with specified permissions and assigned resources.
        </Sheet.SheetDescription>
      </Sheet.SheetHeader>
      <Stepper.StepperProvider variant="horizontal">
        {({ stepper }) => (
          <>
            <Form.Form {...form}>
              <form onSubmit={form.handleSubmit(() => {})}>
                <>
                  <Stepper.StepperNavigation className="pb-4">
                    {stepper.all.map(step => (
                      <Stepper.StepperStep key={step.id} of={step.id} clickable={false}>
                        <Stepper.StepperTitle>{step.title}</Stepper.StepperTitle>
                      </Stepper.StepperStep>
                    ))}
                  </Stepper.StepperNavigation>
                  {stepper.switch({
                    'step-1-general': () => (
                      <>
                        <Heading>General</Heading>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                          <Form.FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                              <Form.FormItem>
                                <Form.FormLabel>Name</Form.FormLabel>
                                <Form.FormControl>
                                  <Input type="text" placeholder="My access token" {...field} />
                                </Form.FormControl>
                                <Form.FormDescription>
                                  Name of the personal access token.
                                </Form.FormDescription>
                                <Form.FormMessage />
                              </Form.FormItem>
                            )}
                          />
                        </div>

                        <div className="mt-6 grid w-full max-w-sm items-center gap-1.5">
                          <Form.FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                              <Form.FormItem>
                                <Form.FormLabel>Description</Form.FormLabel>
                                <Form.FormControl>
                                  <Textarea placeholder="Short description" {...field} />
                                </Form.FormControl>
                                <Form.FormDescription>
                                  Description of the personal access token.
                                </Form.FormDescription>
                                <Form.FormMessage />
                              </Form.FormItem>
                            )}
                          />
                        </div>
                      </>
                    ),
                    'step-2-permissions': () => (
                      <Form.FormField
                        control={form.control}
                        name="permissions"
                        render={() => (
                          <div className="grid w-full items-center gap-1.5">
                            <Form.FormItem>
                              <Form.FormLabel>
                                <Heading>Permissions</Heading>
                              </Form.FormLabel>
                              <Tabs.Tabs
                                defaultValue="full"
                                value={
                                  form.getValues()['allowAllPermissionsGrantedToMember'] === true
                                    ? 'full'
                                    : 'granular'
                                }
                              >
                                <Tabs.TabsList variant="content" className="mt-1">
                                  <Tabs.TabsTrigger
                                    variant="content"
                                    value="full"
                                    onClick={() => {
                                      form.setValue(
                                        'allowAllPermissionsGrantedToMember',
                                        !form.getValues()['allowAllPermissionsGrantedToMember'],
                                        {
                                          shouldTouch: true,
                                          shouldDirty: true,
                                        },
                                      );
                                    }}
                                  >
                                    Full Access
                                  </Tabs.TabsTrigger>
                                  <Tabs.TabsTrigger
                                    variant="content"
                                    value="granular"
                                    onClick={() => {
                                      form.setValue(
                                        'allowAllPermissionsGrantedToMember',
                                        !form.getValues()['allowAllPermissionsGrantedToMember'],
                                        {
                                          shouldValidate: true,
                                          shouldTouch: true,
                                          shouldDirty: true,
                                        },
                                      );
                                    }}
                                  >
                                    Granular Access
                                  </Tabs.TabsTrigger>
                                </Tabs.TabsList>
                                <Tabs.TabsContent value="full" variant="content">
                                  <p className="text-sm">
                                    This token can perform all actions you’re authorized to perform.
                                  </p>
                                </Tabs.TabsContent>
                                <Tabs.TabsContent value="granular" variant="content">
                                  <p className="text-sm">Only selected actions can be performed.</p>
                                  <Form.FormControl>
                                    <PermissionSelector
                                      permissionGroups={
                                        organization.me.availablePersonalAccessTokenPermissionGroups
                                      }
                                      selectedPermissionIds={
                                        new Set(form.getValues()['permissions'])
                                      }
                                      onSelectedPermissionsChange={selectedPermissionIds => {
                                        form.setValue(
                                          'permissions',
                                          Array.from(selectedPermissionIds),
                                          {
                                            shouldValidate: true,
                                            shouldTouch: true,
                                            shouldDirty: true,
                                          },
                                        );
                                      }}
                                    />
                                  </Form.FormControl>
                                  <Form.FormMessage />
                                </Tabs.TabsContent>
                              </Tabs.Tabs>
                            </Form.FormItem>
                          </div>
                        )}
                      />
                    ),
                    'step-3-resources': () => (
                      <>
                        <div className="grid w-full items-center gap-1.5">
                          <Form.FormLabel>
                            <Heading>Resource Access</Heading>
                          </Form.FormLabel>
                          <Form.FormItem>
                            <Form.FormControl>
                              <ResourceSelector
                                organization={organization}
                                selection={resourceSelection}
                                onSelectionChange={setResourceSelection}
                              />
                            </Form.FormControl>
                            <Form.FormMessage />
                          </Form.FormItem>
                        </div>
                      </>
                    ),
                    'step-4-confirmation': () => (
                      <>
                        <Heading>Confirm and create Personal Access Token</Heading>
                        <p className="text-muted-foreground text-sm">
                          Please please review the selected permissions and resources to ensure they
                          align with your intended access needs.
                        </p>
                        <SelectedPermissionOverview
                          activePermissionIds={form.getValues().permissions}
                          isAllPermissionsGranted={
                            form.getValues().allowAllPermissionsGrantedToMember
                          }
                          permissionsGroups={
                            organization.me.availablePersonalAccessTokenPermissionGroups
                          }
                          showOnlyAllowedPermissions
                          isExpanded
                          additionalGroupContent={group => (
                            <div className="w-full space-y-1">
                              {resolvedResources === null ? (
                                <>Granted on all {permissionLevelToResourceName(group.level)}</>
                              ) : (
                                <>
                                  <p className="text-gray-400">
                                    Granted on {permissionLevelToResourceName(group.level)}:
                                  </p>
                                  <ul className="flex list-none flex-wrap gap-1">
                                    {!resolvedResources[group.level]?.length && (
                                      <li>
                                        <Badge
                                          className="px-3 py-1 font-mono text-xs text-red-500"
                                          variant="outline"
                                        >
                                          No {group.level} selected.
                                        </Badge>
                                      </li>
                                    )}
                                    {resolvedResources[group.level].map(id => (
                                      <li key={id}>
                                        <Badge
                                          className="px-3 py-1 font-mono text-xs text-gray-300"
                                          variant="outline"
                                        >
                                          {id}
                                        </Badge>
                                      </li>
                                    ))}
                                  </ul>
                                </>
                              )}
                            </div>
                          )}
                        />
                      </>
                    ),
                  })}
                </>
              </form>
            </Form.Form>
            <Sheet.SheetFooter className="mb-0 mt-auto">
              <Stepper.StepperControls>
                <Button
                  variant="secondary"
                  onClick={stepper.prev}
                  disabled={stepper.isFirst || createPersonalAccessTokenState.fetching}
                >
                  Go back
                </Button>
                {stepper.isLast ? (
                  <Button
                    onClick={
                      createPersonalAccessTokenState.fetching ? undefined : createAccessToken
                    }
                  >
                    {createPersonalAccessTokenState.fetching
                      ? 'Creating...'
                      : 'Create Personal Access Token'}
                  </Button>
                ) : (
                  <Button
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
                        const formValues = form.getValues();
                        if (
                          formValues.permissions.length === 0 &&
                          formValues.allowAllPermissionsGrantedToMember === false
                        ) {
                          form.setError('permissions', {
                            message: 'Please select at least one permission.',
                          });
                          shakeElement(ev);
                          return;
                        }

                        stepper.next();
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
            </Sheet.SheetFooter>
          </>
        )}
      </Stepper.StepperProvider>
      {createPersonalAccessTokenState.data?.createPersonalAccessToken.ok && (
        <AcessTokenCreatedConfirmationDialogue
          onClose={props.onSuccess}
          privateAccessKey={
            createPersonalAccessTokenState.data.createPersonalAccessToken.ok.privateAccessKey
          }
        />
      )}
    </Sheet.SheetContent>
  );
}
