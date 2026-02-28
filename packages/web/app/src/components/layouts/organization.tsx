import { FunctionComponentElement, ReactElement, ReactNode } from 'react';
import { BlocksIcon, BoxIcon, FoldVerticalIcon } from 'lucide-react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { NotFoundContent } from '@/components/common/not-found-content';
import { Header } from '@/components/navigation/header';
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
import { useToast } from '@/components/ui/use-toast';
import { UserMenu } from '@/components/ui/user-menu';
import { graphql } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { getIsStripeEnabled } from '@/lib/billing/stripe-public-key';
import { useToggle } from '@/lib/hooks';
import { useLastVisitedOrganizationWriter } from '@/lib/last-visited-org';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Slot } from '@radix-ui/react-slot';
import { useRouter } from '@tanstack/react-router';
import { ProPlanBilling } from '../organization/billing/ProPlanBillingWarm';
import { RateLimitWarn } from '../organization/billing/RateLimitWarn';
import { HiveLink } from '../ui/hive-link';
import { PlusIcon } from '../ui/icon';
import { QueryError } from '../ui/query-error';
import { OrganizationSelector } from './organization-selectors';

export enum Page {
  Overview = 'overview',
  Members = 'members',
  Settings = 'settings',
  Support = 'support',
  Subscription = 'subscription',
}
const OrganizationLayoutQuery = graphql(`
  query OrganizationLayoutQuery($organizationSlug: String!, $minimal: Boolean!) {
    me {
      id
      provider
      ...UserMenu_MeFragment
    }
    organizationBySlug(organizationSlug: $organizationSlug) @skip(if: $minimal) {
      id
      slug
      viewerCanCreateProject
      viewerCanManageSupportTickets
      viewerCanDescribeBilling
      viewerCanSeeMembers
      viewerCanAccessSettings
      viewerCanManageAccessTokens
      viewerCanManagePersonalAccessTokens
      ...UserMenu_OrganizationFragment
      ...ProPlanBilling_OrganizationFragment
      ...RateLimitWarn_OrganizationFragment
    }
    organizations {
      ...OrganizationSelector_OrganizationConnectionFragment
      ...UserMenu_OrganizationConnectionFragment
    }
  }
`);

export function OrganizationLayout({
  children,
  page,
  className,
  organizationSlug,
  minimal,
}: {
  page?: Page;
  className?: string;
  minimal?: boolean;
  organizationSlug: string;
  children: ReactNode;
}): ReactElement | null {
  const [isModalOpen, toggleModalOpen] = useToggle();
  const [query] = useQuery({
    query: OrganizationLayoutQuery,
    variables: {
      organizationSlug,
      minimal: minimal ?? false,
    },
    requestPolicy: 'cache-first',
  });

  const currentOrganization = query.data?.organizationBySlug;
  useLastVisitedOrganizationWriter(currentOrganization?.slug);

  if (query.error) {
    return <QueryError error={query.error} organizationSlug={organizationSlug} />;
  }

  // Only show the null state state if the query has finished fetching and data is not stale
  // This prevents showing null state when switching between orgs with cached data
  const shouldShowNoOrg = !query.fetching && !query.stale && !currentOrganization && !minimal;

  return (
    <>
      <Header>
        <div className="flex flex-row items-center gap-4">
          <HiveLink className="size-8" />
          <OrganizationSelector
            currentOrganizationSlug={organizationSlug}
            organizations={query.data?.organizations ?? null}
          />
        </div>
        <UserMenu
          me={query.data?.me ?? null}
          currentOrganization={query.data?.organizationBySlug ?? null}
          organizations={query.data?.organizations ?? null}
        />
      </Header>
      <SecondaryNavigation
        page={page}
        loading={!currentOrganization}
        className="min-w-[600px]"
        links={
          currentOrganization
            ? [
                {
                  value: Page.Overview,
                  label: 'Overview',
                  to: '/$organizationSlug',
                  params: { organizationSlug: currentOrganization.slug },
                },
                {
                  value: Page.Members,
                  label: 'Members',
                  visible: currentOrganization.viewerCanSeeMembers,
                  to: '/$organizationSlug/view/members',
                  params: { organizationSlug: currentOrganization.slug },
                  search: { page: 'list' },
                },
                {
                  value: Page.Settings,
                  label: 'Settings',
                  visible:
                    currentOrganization.viewerCanAccessSettings ||
                    currentOrganization.viewerCanManageAccessTokens ||
                    currentOrganization.viewerCanManagePersonalAccessTokens,
                  to: '/$organizationSlug/view/settings',
                  params: { organizationSlug: currentOrganization.slug },
                },
                {
                  value: Page.Support,
                  label: 'Support',
                  visible: currentOrganization.viewerCanManageSupportTickets,
                  to: '/$organizationSlug/view/support',
                  params: { organizationSlug: currentOrganization.slug },
                },
                {
                  value: Page.Subscription,
                  label: 'Subscription',
                  visible: getIsStripeEnabled() && currentOrganization.viewerCanDescribeBilling,
                  to: '/$organizationSlug/view/subscription',
                  params: { organizationSlug: currentOrganization.slug },
                },
              ]
            : []
        }
        actions={
          currentOrganization?.viewerCanCreateProject ? (
            <>
              <Button onClick={toggleModalOpen} variant="link" data-cy="new-project-button">
                <PlusIcon size={16} className="mr-2" />
                New project
              </Button>
              <CreateProjectModal
                organizationSlug={organizationSlug}
                isOpen={isModalOpen}
                toggleModalOpen={toggleModalOpen}
                // reset the form every time it is closed
                key={String(isModalOpen)}
              />
            </>
          ) : null
        }
      />
      <div className="min-h-(--content-height) container pb-7">
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
        ) : (
          <div className={className}>{children}</div>
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
      <FormLabel className="[&:has([data-state=checked])>div]:border-accent_80 cursor-pointer">
        <FormControl>
          <RadioGroupItem value={props.type} className="sr-only" />
        </FormControl>
        <div className="border-neutral-5 hover:border-neutral-2 flex items-center gap-4 rounded-md border p-4">
          <Slot className="text-neutral-12 size-8">{props.icon}</Slot>
          <div>
            <span className="text-neutral-12 text-sm font-medium">{props.title}</span>
            <p className="text-neutral-11 text-sm">{props.description}</p>
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
      <DialogContent className="w-4/5 max-w-[600px] md:w-3/5">
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
                              className={cn(
                                field.value === ProjectType.Single && 'text-neutral-12',
                              )}
                            />
                          }
                        />
                        <ProjectTypeCard
                          type={ProjectType.Federation}
                          title="Federation"
                          description="Project developed according to Apollo Federation specification"
                          icon={
                            <BlocksIcon
                              className={cn(
                                field.value === ProjectType.Federation && 'text-neutral-12',
                              )}
                            />
                          }
                        />
                        <ProjectTypeCard
                          type={ProjectType.Stitching}
                          title="Stitching"
                          description="Project that stitches together multiple GraphQL APIs"
                          icon={
                            <FoldVerticalIcon
                              className={cn(
                                field.value === ProjectType.Stitching && 'text-neutral-12',
                              )}
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
