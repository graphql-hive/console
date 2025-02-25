import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import * as Form from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import * as Sheet from '@/components/ui/sheet';
import { defineStepper } from '@/components/ui/stepper';
import { Textarea } from '@/components/ui/textarea';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as GraphQLSchema from '@/gql/graphql';
import { PermissionSelector } from '../../members/permission-selector';
import { ResourceSelector } from '../../members/resource-selector';

const CreateAccessTokenSheetContent_OrganizationFragment = graphql(`
  fragment CreateAccessTokenSheetContent_OrganizationFragment on Organization {
    id
    availableOrganizationPermissionGroups {
      ...PermissionSelector_PermissionGroupsFragment
    }
    ...ResourceSelector_OrganizationFragment
  }
`);

type CreateAccessTokenSheetContentProps = {
  onSuccess: () => void;
  organization: FragmentType<typeof CreateAccessTokenSheetContent_OrganizationFragment>;
};

export function CreateAccessTokenSheetContent(
  props: CreateAccessTokenSheetContentProps,
): React.ReactNode {
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
  const [resourceSelection, setResourceSelection] = useState<GraphQLSchema.ResourceAssignmentInput>(
    () => ({
      mode: GraphQLSchema.ResourceAssignmentMode.All,
      projects: [],
    }),
  );

  const form = useForm({
    mode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      selectedPermissions: [],
      assignedResources: {} as GraphQLSchema.ResourceAssignmentInput,
    },
  });

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
              <form className="space-y-4" onSubmit={form.handleSubmit(() => {})}>
                <>
                  <Stepper.StepperNavigation>
                    {stepper.all.map(step => (
                      <Stepper.StepperStep
                        key={step.id}
                        of={step.id}
                        onClick={() => stepper.goTo(step.id)}
                      >
                        <Stepper.StepperTitle>{step.title}</Stepper.StepperTitle>
                      </Stepper.StepperStep>
                    ))}
                  </Stepper.StepperNavigation>
                  {stepper.switch({
                    'step-1-general': () => (
                      <>
                        <div className="grid w-full max-w-sm items-center gap-1.5">
                          <Form.FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                              <Form.FormItem>
                                <Form.FormLabel>Name</Form.FormLabel>
                                <Form.FormControl>
                                  <Input placeholder="shadcn" {...field} />
                                </Form.FormControl>
                                <Form.FormDescription>
                                  Name of the access token.
                                </Form.FormDescription>
                                <Form.FormMessage />
                              </Form.FormItem>
                            )}
                          />
                        </div>

                        <div className="grid w-full max-w-sm items-center gap-1.5">
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
                      <>
                        <div className="grid w-full items-center gap-1.5">
                          <Form.FormField
                            control={form.control}
                            name="selectedPermissions"
                            render={() => (
                              <Form.FormItem>
                                <Form.FormLabel>Permissions</Form.FormLabel>
                                <Form.FormControl>
                                  <PermissionSelector
                                    selectedPermissionIds={new Set()}
                                    onSelectedPermissionsChange={() => {}}
                                    permissionGroups={
                                      organization.availableOrganizationPermissionGroups
                                    }
                                  />
                                </Form.FormControl>
                                <Form.FormMessage />
                              </Form.FormItem>
                            )}
                          />
                        </div>
                      </>
                    ),
                    'step-3-resources': () => (
                      <>
                        <div className="grid w-full items-center gap-1.5">
                          <Form.FormField
                            control={form.control}
                            name="selectedPermissions"
                            render={() => (
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
                            )}
                          />
                        </div>
                      </>
                    ),
                    'step-4-confirmation': () => <>TBD</>,
                  })}
                </>
              </form>
            </Form.Form>
            <Sheet.SheetFooter className="mb-0 mt-auto">
              <Stepper.StepperControls>
                {!stepper.isLast && (
                  <Button variant="secondary" onClick={stepper.prev} disabled={stepper.isFirst}>
                    Previous
                  </Button>
                )}
                <Button onClick={stepper.isLast ? stepper.reset : stepper.next}>
                  {stepper.isLast ? 'Reset' : 'Next'}
                </Button>
              </Stepper.StepperControls>
            </Sheet.SheetFooter>
          </>
        )}
      </Stepper.StepperProvider>
    </Sheet.SheetContent>
  );
}
