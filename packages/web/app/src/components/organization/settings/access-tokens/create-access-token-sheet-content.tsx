import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from 'urql';
import { z } from 'zod';
import * as AlertDialog from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import * as Form from '@/components/ui/form';
import { Heading } from '@/components/ui/heading';
import { Input } from '@/components/ui/input';
import { InputCopy } from '@/components/ui/input-copy';
import * as Sheet from '@/components/ui/sheet';
import { defineStepper } from '@/components/ui/stepper';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Tag } from '@/components/v2';
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
import { permissionLevelToResourceName, resolveResources } from './shared-helpers';

/** @soure packages/services/api/src/modules/organization/providers/organization-access-tokens.ts */
const TitleInputModel = z
  .string()
  .trim()
  .regex(/^[ a-zA-Z0-9_-]+$/, 'Can only contain letters, numbers, " ", "_", and "-".')
  .min(2, 'Minimum length is 2 characters.')
  .max(100, 'Maximum length is 100 characters.');

/** @soure packages/services/api/src/modules/organization/providers/organization-access-tokens.ts */
const DescriptionInputModel = z
  .string()
  .trim()
  .max(248, 'Maximum length is 248 characters.')
  .optional();

const CreateAccessTokenFormModel = z.object({
  title: TitleInputModel,
  description: DescriptionInputModel,
  permissions: z.array(z.string()).min(1, 'Please select at least one permission.'),
});

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
  onSuccess: () => void;
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

  const form = useForm<z.TypeOf<typeof CreateAccessTokenFormModel>>({
    mode: 'onChange',
    resolver: zodResolver(CreateAccessTokenFormModel),
    defaultValues: {
      title: '',
      description: '',
      permissions: [],
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
        <Sheet.SheetTitle>Create Access Token</Sheet.SheetTitle>
        <Sheet.SheetDescription>
          Create a new access token with specified permissions and optionally assigned resources.
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
                                  Name of the access token.
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
                                  Description of the access token.
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
                              <Form.FormControl>
                                <PermissionSelector
                                  permissionGroups={
                                    organization.availableOrganizationAccessTokenPermissionGroups
                                  }
                                  selectedPermissionIds={new Set(form.getValues()['permissions'])}
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
                            </Form.FormItem>
                          </div>
                        )}
                      />
                    ),
                    'step-3-resources': () => (
                      <>
                        <div className="grid w-full items-center gap-1.5">
                          <Form.FormItem>
                            <Form.FormLabel>Resource Access</Form.FormLabel>
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
                        <Heading>Confirm and create Access Token</Heading>
                        <p className="text-muted-foreground text-sm">
                          Please please review the selected permissions and resources to ensure they
                          align with your intended access needs.
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
                        )}
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
                  disabled={stepper.isFirst || createOrganizationAccessTokenState.fetching}
                >
                  Go back
                </Button>
                {stepper.isLast ? (
                  <Button
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
            </Sheet.SheetFooter>
          </>
        )}
      </Stepper.StepperProvider>
      {createOrganizationAccessTokenState.data?.createOrganizationAccessToken.ok && (
        <AcessTokenCreatedConfirmationDialogue
          onClose={props.onSuccess}
          privateAccessKey={
            createOrganizationAccessTokenState.data.createOrganizationAccessToken.ok
              .privateAccessKey
          }
        />
      )}
    </Sheet.SheetContent>
  );
}

function AcessTokenCreatedConfirmationDialogue(props: {
  privateAccessKey: string;
  onClose: () => void;
}) {
  const [isConfirmed, setIsConfirmed] = useState(false);
  return (
    <AlertDialog.AlertDialog open>
      <AlertDialog.AlertDialogContent>
        <AlertDialog.AlertDialogHeader>
          <AlertDialog.AlertDialogTitle>Access Token Created</AlertDialog.AlertDialogTitle>
          <AlertDialog.AlertDialogDescription>
            Your API access token has been generated successfully
          </AlertDialog.AlertDialogDescription>
        </AlertDialog.AlertDialogHeader>
        <div>
          <InputCopy value={props.privateAccessKey} />
        </div>
        <Tag color="green" className="text-sm">
          This is your unique API key and it is non-recoverable. If you lose this key, you will need
          to create a new one.
        </Tag>
        <AlertDialog.AlertDialogFooter>
          <div className="ml-0 mr-auto flex items-center space-x-2 pr-2">
            <Checkbox
              id="AcessTokenCreatedConfirmationDialogue-isConfirmed"
              checked={isConfirmed}
              onCheckedChange={value => setIsConfirmed(!!value)}
            />
            <label
              htmlFor="AcessTokenCreatedConfirmationDialogue-isConfirmed"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I stored the access token somewhere safe
            </label>
          </div>
          <AlertDialog.AlertDialogAction
            onClick={isConfirmed ? props.onClose : undefined}
            disabled={!isConfirmed}
          >
            Confirm
          </AlertDialog.AlertDialogAction>
        </AlertDialog.AlertDialogFooter>
      </AlertDialog.AlertDialogContent>
    </AlertDialog.AlertDialog>
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
