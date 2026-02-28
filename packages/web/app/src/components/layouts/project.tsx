import { ReactNode } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
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
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { UserMenu } from '@/components/ui/user-menu';
import { graphql } from '@/gql';
import { useToggle } from '@/lib/hooks';
import { useLastVisitedOrganizationWriter } from '@/lib/last-visited-org';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';
import { ResourceNotFoundComponent } from '../resource-not-found';
import { HiveLink } from '../ui/hive-link';
import { PlusIcon } from '../ui/icon';
import { ProjectSelector } from './project-selector';

export enum Page {
  Targets = 'targets',
  Alerts = 'alerts',
  Settings = 'settings',
}

const ProjectLayoutQuery = graphql(`
  query ProjectLayoutQuery($organizationSlug: String!, $projectSlug: String!) {
    me {
      id
      ...UserMenu_MeFragment
    }
    organizations {
      ...ProjectSelector_OrganizationConnectionFragment
      ...UserMenu_OrganizationConnectionFragment
    }
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        viewerCanModifySchemaPolicy
        viewerCanCreateTarget
        viewerCanModifyAlerts
        viewerCanModifySettings
        viewerCanManageProjectAccessTokens
      }
      ...UserMenu_OrganizationFragment
    }
  }
`);

export function ProjectLayout({
  children,
  page,
  className,
  organizationSlug,
  projectSlug,
}: {
  page: Page;
  organizationSlug: string;
  projectSlug: string;
  className?: string;
  children: ReactNode;
}) {
  const params = { organizationSlug, projectSlug };

  const [isModalOpen, toggleModalOpen] = useToggle();
  const [query] = useQuery({
    query: ProjectLayoutQuery,
    requestPolicy: 'cache-first',
    variables: params,
  });

  const me = query.data?.me;
  const currentOrganization = query.data?.organization;
  const currentProject = currentOrganization?.project;

  useLastVisitedOrganizationWriter(currentOrganization?.slug);

  return (
    <>
      <Header>
        <div className="flex flex-row items-center gap-4">
          <HiveLink className="size-8" />
          <ProjectSelector
            currentOrganizationSlug={organizationSlug}
            currentProjectSlug={projectSlug}
            organizations={query.data?.organizations ?? null}
          />
        </div>
        <div>
          <UserMenu
            me={me ?? null}
            currentOrganization={currentOrganization ?? null}
            organizations={query.data?.organizations ?? null}
          />
        </div>
      </Header>
      {query.fetching === false &&
      query.stale === false &&
      (currentProject === null || currentOrganization === null) ? (
        <ResourceNotFoundComponent title="404 - This project does not seem to exist." />
      ) : (
        <>
          <SecondaryNavigation
            page={page}
            loading={!currentOrganization || !currentProject}
            links={
              currentOrganization && currentProject
                ? [
                    {
                      value: Page.Targets,
                      label: 'Targets',
                      to: '/$organizationSlug/$projectSlug',
                      params,
                    },
                    {
                      value: Page.Alerts,
                      label: 'Alerts',
                      visible: currentProject.viewerCanModifyAlerts,
                      to: '/$organizationSlug/$projectSlug/view/alerts',
                      params,
                    },
                    {
                      value: Page.Settings,
                      label: 'Settings',
                      visible:
                        currentProject.viewerCanModifySettings ||
                        currentProject.viewerCanManageProjectAccessTokens,
                      to: '/$organizationSlug/$projectSlug/view/settings',
                      params,
                    },
                  ]
                : []
            }
            actions={
              currentProject?.viewerCanCreateTarget ? (
                <>
                  <Button onClick={toggleModalOpen} variant="link">
                    <PlusIcon size={16} className="mr-2" />
                    New target
                  </Button>
                  <CreateTargetModal
                    organizationSlug={organizationSlug}
                    projectSlug={projectSlug}
                    isOpen={isModalOpen}
                    toggleModalOpen={toggleModalOpen}
                  />
                </>
              ) : null
            }
          />
          <div className="min-h-(--content-height) container pb-7">
            <div className={className}>{children}</div>
          </div>
        </>
      )}
    </>
  );
}

export const CreateTarget_CreateTargetMutation = graphql(`
  mutation CreateTarget_CreateTarget($input: CreateTargetInput!) {
    createTarget(input: $input) {
      ok {
        selector {
          organizationSlug
          projectSlug
          targetSlug
        }
        createdTarget {
          id
          slug
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

const createTargetFormSchema = z.object({
  targetSlug: z
    .string({
      required_error: 'Target slug is required',
    })
    .min(2, {
      message: 'Target slug must be at least 2 characters long',
    })
    .max(50, {
      message: 'Target slug must be at most 50 characters long',
    }),
});

function CreateTargetModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
  projectSlug: string;
}) {
  const { organizationSlug, projectSlug } = props;
  const [_, mutate] = useMutation(CreateTarget_CreateTargetMutation);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createTargetFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(createTargetFormSchema),
    defaultValues: {
      targetSlug: '',
    },
  });

  async function onSubmit(values: z.infer<typeof createTargetFormSchema>) {
    const { data, error } = await mutate({
      input: {
        project: {
          bySelector: {
            projectSlug: props.projectSlug,
            organizationSlug: props.organizationSlug,
          },
        },
        slug: values.targetSlug,
      },
    });

    if (data?.createTarget.ok) {
      props.toggleModalOpen();
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params: {
          organizationSlug,
          projectSlug,
          targetSlug: data.createTarget.ok.createdTarget.slug,
        },
      });
      toast({
        variant: 'default',
        title: 'Target created',
        description: `Your target "${data.createTarget.ok.createdTarget.slug}" has been created`,
      });
    } else if (data?.createTarget.error?.inputErrors.slug) {
      form.setError('targetSlug', {
        message: data?.createTarget.error?.inputErrors.slug,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Failed to create target',
        description: error?.message || data?.createTarget.error?.message,
      });
    }
  }

  return (
    <CreateTargetModalContent
      form={form}
      isOpen={props.isOpen}
      onSubmit={onSubmit}
      toggleModalOpen={props.toggleModalOpen}
    />
  );
}

export function CreateTargetModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  onSubmit: (values: z.infer<typeof createTargetFormSchema>) => void | Promise<void>;
  form: UseFormReturn<z.infer<typeof createTargetFormSchema>>;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="w-4/5 max-w-[520px] md:w-3/5">
        <Form {...props.form}>
          <form className="space-y-8" onSubmit={props.form.handleSubmit(props.onSubmit)}>
            <DialogHeader>
              <DialogTitle>Create a new target</DialogTitle>
              <DialogDescription>
                A project is built on top of <b>Targets</b>, which are just your environments.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-8">
              <FormField
                control={props.form.control}
                name="targetSlug"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="my-target" autoComplete="off" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>
            <DialogFooter>
              <Button
                className="w-full"
                type="submit"
                disabled={props.form.formState.isSubmitting || !props.form.formState.isValid}
              >
                {props.form.formState.isSubmitting ? 'Submitting...' : 'Create Target'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
