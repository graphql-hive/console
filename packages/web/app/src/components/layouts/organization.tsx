import { FunctionComponentElement } from 'react';
import { BlocksIcon, BoxIcon, FoldVerticalIcon } from 'lucide-react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation } from 'urql';
import { z } from 'zod';
import { NotFoundContent } from '@/components/common/not-found-content';
import { PrimaryNavigation } from '@/components/navigation/primary-navigation';
import { SecondaryNavigation } from '@/components/navigation/secondary-navigation';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Spinner } from '@/components/ui/spinner';
import { useToast } from '@/components/ui/use-toast';
import { graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { getIsStripeEnabled } from '@/lib/billing/stripe-public-key';
import { useToggle } from '@/lib/hooks';
import { useLastVisitedOrganizationWriter } from '@/lib/last-visited-org';
import { cn } from '@/lib/utils';
import { organizationLayoutRoute } from '@/router';
import { zodResolver } from '@hookform/resolvers/zod';
import { Slot } from '@radix-ui/react-slot';
import { Outlet, useMatches, useRouter } from '@tanstack/react-router';
import { ProPlanBilling } from '../organization/billing/ProPlanBillingWarm';
import { RateLimitWarn } from '../organization/billing/RateLimitWarn';
import { PlusIcon } from '../ui/icon';

export enum Page {
  Overview = 'overview',
  Members = 'members',
  Settings = 'settings',
  Support = 'support',
  Subscription = 'subscription',
}

export const OrganizationLayoutDataFragment = graphql(`
  fragment OrganizationLayoutDataFragment on Query {
    me {
      ...PrimaryNavigation_MeFragment
    }
    organizationBySlug(organizationSlug: $organizationSlug) {
      id
    }
    organizations {
      ...PrimaryNavigation_OrganizationConnectionFragment
      nodes {
        id
        slug
        viewerCanCreateProject
        viewerCanManageSupportTickets
        viewerCanDescribeBilling
        viewerCanSeeMembers
        ...ProPlanBilling_OrganizationFragment
        ...RateLimitWarn_OrganizationFragment
      }
    }
  }
`);

export function OrganizationLayout() {
  const [isModalOpen, toggleModalOpen] = useToggle();

  const { organizationSlug } = organizationLayoutRoute.useParams();

  const matches = useMatches();

  const matchesWithData = matches.filter(m => m.status !== 'pending');
  const activeChildMatch = matchesWithData[matchesWithData.length - 1];
  const layoutFragmentRef = activeChildMatch?.loaderData || null;

  const layoutData = useFragment(OrganizationLayoutDataFragment, layoutFragmentRef);

  const currentOrganization = layoutData?.organizations.nodes.find(
    org => org.slug === organizationSlug,
  );

  useLastVisitedOrganizationWriter(currentOrganization?.slug);

  // If we have layoutData, we've loaded
  const shouldShowNoOrg = layoutData && !layoutData.organizationBySlug;

  return (
    <>
      <PrimaryNavigation
        me={layoutData?.me ?? null}
        organizations={layoutData?.organizations ?? null}
      />
      <SecondaryNavigation
        displayCondition={!!currentOrganization}
        actions={[
          {
            displayCondition: currentOrganization?.viewerCanCreateProject,
            actionItem: (
              <>
                <Button
                  onClick={toggleModalOpen}
                  variant="link"
                  className="text-orange-500"
                  data-cy="new-project-button"
                >
                  <PlusIcon size={16} className="mr-2" />
                  New project
                </Button>
                <CreateProjectModal
                  organizationSlug={organizationSlug!}
                  isOpen={isModalOpen}
                  toggleModalOpen={toggleModalOpen}
                  // reset the form every time it is closed
                  key={String(isModalOpen)}
                />
              </>
            ),
          },
        ]}
        items={[
          {
            activeOptions: { exact: true },
            title: 'Overview',
            to: '/$organizationSlug',
          },
          {
            displayCondition: currentOrganization?.viewerCanSeeMembers,
            title: 'Members',
            to: '/$organizationSlug/view/members',
          },
          {
            title: 'Settings',
            to: '/$organizationSlug/view/settings',
          },
          {
            displayCondition: currentOrganization?.viewerCanManageSupportTickets,
            title: 'Support',
            to: '/$organizationSlug/view/support',
          },
          {
            displayCondition: getIsStripeEnabled() && currentOrganization?.viewerCanDescribeBilling,
            title: 'Subscription',
            to: '/$organizationSlug/view/subscription',
          },
        ]}
        params={{ organizationSlug: currentOrganization?.slug }}
      />

      <div className="container min-h-[var(--content-height)] pb-7">
        {currentOrganization ? (
          <>
            <ProPlanBilling organization={currentOrganization} />
            <RateLimitWarn organization={currentOrganization} />
          </>
        ) : null}

        {shouldShowNoOrg ? (
          <NotFoundContent
            heading="Organization not found"
            subheading="Use the empty dropdown in the header to select an organization to which you have access."
            includeBackButton={false}
          />
        ) : !layoutData ? (
          <Spinner className="m-auto mt-6" />
        ) : (
          <Outlet />
        )}
      </div>
    </>
  );
}

export const CreateProjectMutation = graphql(`
  mutation CreateProject_CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
      ok {
        createdProject {
          id
          slug
        }
        createdTargets {
          id
          slug
        }
        updatedOrganization {
          id
        }
      }
      error {
        message
        inputErrors {
          slug
        }
      }
    }
  }
`);

const createProjectFormSchema = z.object({
  projectSlug: z
    .string({
      required_error: 'Project slug is required',
    })
    .min(2, {
      message: 'Project slug must be at least 2 characters long',
    })
    .max(50, {
      message: 'Project slug must be at most 50 characters long',
    }),
  projectType: z.nativeEnum(ProjectType, {
    required_error: 'Project type is required',
  }),
});

function ProjectTypeCard(props: {
  title: string;
  description: string;
  type: ProjectType;
  icon: FunctionComponentElement<{ className: string }>;
}) {
  return (
    <FormItem>
      <FormLabel className="[&:has([data-state=checked])>div]:border-primary cursor-pointer">
        <FormControl>
          <RadioGroupItem value={props.type} className="sr-only" />
        </FormControl>
        <div className="border-muted hover:border-accent hover:bg-accent flex items-center gap-4 rounded-md border-2 p-4">
          <Slot className="size-8 text-gray-400">{props.icon}</Slot>
          <div>
            <span className="text-sm font-medium">{props.title}</span>
            <p className="text-sm text-gray-400">{props.description}</p>
          </div>
        </div>
      </FormLabel>
    </FormItem>
  );
}

function CreateProjectModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
}) {
  const [_, mutate] = useMutation(CreateProjectMutation);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createProjectFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      projectSlug: '',
      projectType: ProjectType.Single,
    },
  });

  async function onSubmit(values: z.infer<typeof createProjectFormSchema>) {
    const { data, error } = await mutate({
      input: {
        organization: {
          bySelector: {
            organizationSlug: props.organizationSlug,
          },
        },
        slug: values.projectSlug,
        type: values.projectType,
      },
    });
    if (data?.createProject.ok) {
      props.toggleModalOpen();
      void router.navigate({
        to: '/$organizationSlug/$projectSlug',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: data.createProject.ok.createdProject.slug,
        },
      });
    } else if (data?.createProject.error?.inputErrors.slug) {
      form.setError('projectSlug', {
        message: data?.createProject.error?.inputErrors.slug,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to create project',
        description: error?.message || data?.createProject.error?.message,
      });
    }
  }

  return (
    <CreateProjectModalContent
      isOpen={props.isOpen}
      toggleModalOpen={props.toggleModalOpen}
      form={form}
      onSubmit={onSubmit}
    />
  );
}

export function CreateProjectModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  form: UseFormReturn<z.infer<typeof createProjectFormSchema>>;
  onSubmit: (values: z.infer<typeof createProjectFormSchema>) => void | Promise<void>;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="container w-4/5 max-w-[600px] md:w-3/5">
        <Form {...props.form}>
          <form onSubmit={props.form.handleSubmit(props.onSubmit)} data-cy="create-project-form">
            <DialogHeader className="mb-8">
              <DialogTitle>Create a project</DialogTitle>
              <DialogDescription>
                A Hive <b>project</b> represents a <b>GraphQL API</b> running a GraphQL schema.
              </DialogDescription>
            </DialogHeader>
            <div>
              <FormField
                control={props.form.control}
                name="projectSlug"
                render={({ field }) => {
                  return (
                    <FormItem className="mt-0">
                      <FormLabel>Slug of your project</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="my-project"
                          data-cy="slug"
                          autoComplete="off"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              <FormField
                control={props.form.control}
                name="projectType"
                render={({ field }) => {
                  return (
                    <FormItem className="mt-2">
                      <FormLabel>Project Type</FormLabel>
                      <RadioGroup onValueChange={field.onChange} defaultValue={field.value}>
                        <ProjectTypeCard
                          type={ProjectType.Single}
                          title="Monolith"
                          description="Single GraphQL schema developed as a monolith"
                          icon={
                            <BoxIcon
                              className={cn(field.value === ProjectType.Single && 'text-white')}
                            />
                          }
                        />
                        <ProjectTypeCard
                          type={ProjectType.Federation}
                          title="Federation"
                          description="Project developed according to Apollo Federation specification"
                          icon={
                            <BlocksIcon
                              className={cn(field.value === ProjectType.Federation && 'text-white')}
                            />
                          }
                        />
                        <ProjectTypeCard
                          type={ProjectType.Stitching}
                          title="Stitching"
                          description="Project that stitches together multiple GraphQL APIs"
                          icon={
                            <FoldVerticalIcon
                              className={cn(field.value === ProjectType.Stitching && 'text-white')}
                            />
                          }
                        />
                      </RadioGroup>
                    </FormItem>
                  );
                }}
              />
            </div>
            <DialogFooter className="mt-8">
              <Button
                className="w-full"
                type="submit"
                data-cy="submit"
                disabled={props.form.formState.isSubmitting || !props.form.formState.isValid}
              >
                {props.form.formState.isSubmitting ? 'Submitting...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
