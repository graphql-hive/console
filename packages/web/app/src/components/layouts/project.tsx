import { ReactNode } from 'react';
import { useForm, UseFormReturn } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
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
import { Tabs } from '@/components/v2/tabs';
import { graphql } from '@/gql';
import { canAccessProject, ProjectAccessScope, useProjectAccess } from '@/lib/access/project';
import { useToggle } from '@/lib/hooks';
import { useLastVisitedOrganizationWriter } from '@/lib/last-visited-org';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';
import { ProjectMigrationToast } from '../project/migration-toast';
import { HiveLink } from '../ui/hive-link';
import { PlusIcon } from '../ui/icon';
import { ProjectSelector } from './project-selector';

export enum Page {
  Targets = 'targets',
  Alerts = 'alerts',
  Policy = 'policy',
  Settings = 'settings',
}

const ProjectLayoutQuery = graphql(`
  query ProjectLayoutQuery {
    me {
      id
      ...UserMenu_MeFragment
    }
    organizations {
      nodes {
        id
        cleanId
        name
        me {
          id
          ...CanAccessProject_MemberFragment
        }
        projects {
          nodes {
            id
            cleanId
            name
            registryModel
          }
        }
      }
      ...ProjectSelector_OrganizationConnectionFragment
      ...UserMenu_OrganizationConnectionFragment
    }
  }
`);

export function ProjectLayout({
  children,
  page,
  className,
  ...props
}: {
  page: Page;
  organizationId: string;
  projectId: string;
  className?: string;
  children: ReactNode;
}) {
  const [isModalOpen, toggleModalOpen] = useToggle();
  const [query] = useQuery({
    query: ProjectLayoutQuery,
    requestPolicy: 'cache-first',
  });

  const me = query.data?.me;
  const currentOrganization = query.data?.organizations.nodes.find(
    node => node.cleanId === props.organizationId,
  );
  const currentProject = currentOrganization?.projects.nodes.find(
    node => node.cleanId === props.projectId,
  );

  useProjectAccess({
    scope: ProjectAccessScope.Read,
    member: currentOrganization?.me ?? null,
    redirect: true,
    organizationId: props.organizationId,
    projectId: props.projectId,
  });

  useLastVisitedOrganizationWriter(currentOrganization?.cleanId);

  return (
    <>
      <header>
        <div className="container flex h-[--header-height] items-center justify-between">
          <div className="flex flex-row items-center gap-4">
            <HiveLink className="size-8" />
            <ProjectSelector
              currentOrganizationCleanId={props.organizationId}
              currentProjectCleanId={props.projectId}
              organizations={query.data?.organizations ?? null}
            />
          </div>
          <div>
            <UserMenu
              me={me ?? null}
              currentOrganizationCleanId={props.organizationId}
              organizations={query.data?.organizations ?? null}
            />
          </div>
        </div>
      </header>

      {page === Page.Settings || currentProject?.registryModel !== 'LEGACY' ? null : (
        <ProjectMigrationToast orgId={props.organizationId} projectId={currentProject.cleanId} />
      )}

      <div className="relative h-[--tabs-navbar-height] border-b border-gray-800">
        <div className="container flex items-center justify-between">
          {currentOrganization && currentProject ? (
            <Tabs value={page}>
              <Tabs.List>
                <Tabs.Trigger value={Page.Targets} asChild>
                  <Link
                    to="/$organizationId/$projectId"
                    params={{
                      organizationId: currentOrganization.cleanId,
                      projectId: currentProject.cleanId,
                    }}
                  >
                    Targets
                  </Link>
                </Tabs.Trigger>
                {canAccessProject(ProjectAccessScope.Alerts, currentOrganization.me) && (
                  <Tabs.Trigger value={Page.Alerts} asChild>
                    <Link
                      to="/$organizationId/$projectId/view/alerts"
                      params={{
                        organizationId: currentOrganization.cleanId,
                        projectId: currentProject.cleanId,
                      }}
                    >
                      Alerts
                    </Link>
                  </Tabs.Trigger>
                )}
                {canAccessProject(ProjectAccessScope.Settings, currentOrganization.me) && (
                  <>
                    <Tabs.Trigger value={Page.Policy} asChild>
                      <Link
                        to="/$organizationId/$projectId/view/policy"
                        params={{
                          organizationId: currentOrganization.cleanId,
                          projectId: currentProject.cleanId,
                        }}
                      >
                        Policy
                      </Link>
                    </Tabs.Trigger>
                    <Tabs.Trigger value={Page.Settings} asChild>
                      <Link
                        to="/$organizationId/$projectId/view/settings"
                        params={{
                          organizationId: currentOrganization.cleanId,
                          projectId: currentProject.cleanId,
                        }}
                      >
                        Settings
                      </Link>
                    </Tabs.Trigger>
                  </>
                )}
              </Tabs.List>
            </Tabs>
          ) : (
            <div className="flex flex-row gap-x-8 border-b-2 border-b-transparent px-4 py-3">
              <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
              <div className="h-5 w-12 animate-pulse rounded-full bg-gray-800" />
            </div>
          )}
          {currentProject ? (
            <Button onClick={toggleModalOpen} variant="link" className="text-orange-500">
              <PlusIcon size={16} className="mr-2" />
              New target
            </Button>
          ) : null}
          <CreateTargetModal
            organizationId={props.organizationId}
            projectId={props.projectId}
            isOpen={isModalOpen}
            toggleModalOpen={toggleModalOpen}
          />
        </div>
      </div>
      <div className="container min-h-[var(--content-height)] pb-7">
        <div className={className}>{children}</div>
      </div>
    </>
  );
}

export const CreateTarget_CreateTargetMutation = graphql(`
  mutation CreateTarget_CreateTarget($input: CreateTargetInput!) {
    createTarget(input: $input) {
      ok {
        selector {
          organization
          project
          target
        }
        createdTarget {
          id
          cleanId
          name
        }
      }
      error {
        message
        inputErrors {
          name
        }
      }
    }
  }
`);

const createProjectFormSchema = z.object({
  targetName: z
    .string({
      required_error: 'Target name is required',
    })
    .min(2, {
      message: 'Target name must be at least 2 characters long',
    })
    .max(50, {
      message: 'Target name must be at most 50 characters long',
    }),
});

function CreateTargetModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationId: string;
  projectId: string;
}) {
  const { organizationId, projectId } = props;
  const [_, mutate] = useMutation(CreateTarget_CreateTargetMutation);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof createProjectFormSchema>>({
    mode: 'onChange',
    resolver: zodResolver(createProjectFormSchema),
    defaultValues: {
      targetName: '',
    },
  });

  async function onSubmit(values: z.infer<typeof createProjectFormSchema>) {
    const { data, error } = await mutate({
      input: {
        project: props.projectId,
        organization: props.organizationId,
        name: values.targetName,
      },
    });

    if (data?.createTarget.ok) {
      props.toggleModalOpen();
      void router.navigate({
        to: '/$organizationId/$projectId/$targetId',
        params: {
          organizationId,
          projectId,
          targetId: data.createTarget.ok.createdTarget.cleanId,
        },
      });
      toast({
        variant: 'default',
        title: 'Target created',
        description: `Your target "${data.createTarget.ok.createdTarget.name}" has been created`,
      });
    } else if (data?.createTarget.error?.inputErrors.name) {
      form.setError('targetName', {
        message: data?.createTarget.error?.inputErrors.name,
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
  onSubmit: (values: z.infer<typeof createProjectFormSchema>) => void | Promise<void>;
  form: UseFormReturn<z.infer<typeof createProjectFormSchema>>;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="container w-4/5 max-w-[520px] md:w-3/5">
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
                name="targetName"
                render={({ field }) => {
                  return (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Target name" autoComplete="off" {...field} />
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
