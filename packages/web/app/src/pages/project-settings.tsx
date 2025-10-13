import { ReactElement, useCallback, useMemo } from 'react';
import { ArrowBigDownDashIcon, CheckIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { Page, ProjectLayout } from '@/components/layouts/project';
import { PolicySettings } from '@/components/policy/policy-settings';
import { CompositionSettings } from '@/components/project/settings/composition';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DocsLink } from '@/components/ui/docs-note';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { HiveLogo } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Meta } from '@/components/ui/meta';
import {
  NavLayout,
  PageLayout,
  PageLayoutContent,
  SubPageLayout,
  SubPageLayoutHeader,
} from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { ResourceDetails } from '@/components/ui/resource-details';
import { useToast } from '@/components/ui/use-toast';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { getDocsUrl } from '@/lib/docs-url';
import { useNotifications, useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';

const GithubIntegration_GithubIntegrationDetailsQuery = graphql(`
  query getGitHubIntegrationDetails($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      gitHubIntegration {
        repositories {
          nameWithOwner
        }
      }
    }
  }
`);

const GithubIntegration_EnableProjectNameInGitHubCheckMutation = graphql(`
  mutation GithubIntegration_EnableProjectNameInGitHubCheckMutation($input: ProjectSelectorInput!) {
    enableProjectNameInGithubCheck(input: $input) {
      id
      slug
      isProjectNameInGitHubCheckEnabled
    }
  }
`);

function GitHubIntegration(props: {
  organizationSlug: string;
  projectSlug: string;
}): ReactElement | null {
  const docksLink = getDocsUrl('integrations/ci-cd#github-workflow-for-ci');
  const notify = useNotifications();
  const [integrationQuery] = useQuery({
    query: GithubIntegration_GithubIntegrationDetailsQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
  });

  const [ghCheckMutation, ghCheckMutate] = useMutation(
    GithubIntegration_EnableProjectNameInGitHubCheckMutation,
  );

  if (integrationQuery.fetching) {
    return null;
  }

  const githubIntegration = integrationQuery.data?.organization?.gitHubIntegration;

  if (!githubIntegration) {
    return null;
  }

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Use project's name in GitHub Check"
        description={
          <CardDescription>
            Prevents GitHub Check name collisions when running{' '}
            <a href={docksLink}>
              <span className="mx-1 text-orange-700 hover:underline hover:underline-offset-4">
                $ hive schema:check --github
              </span>
            </a>
            for more than one project.
          </CardDescription>
        }
      />
      <div>
        <div className="text-muted-foreground text-sm">
          <div>Here's how it will look like in your CI pipeline.</div>
          <div className="my-8 flex w-fit flex-col gap-y-1">
            <div className="flex items-center gap-x-2 pl-1">
              <CheckIcon className="size-4 text-emerald-500" />
              <div className="flex size-6 items-center justify-center rounded-sm bg-white">
                <HiveLogo className="size-4/5" />
              </div>

              <div className="font-semibold text-[#adbac7]">
                {props.organizationSlug} &gt; schema:check &gt; staging
              </div>
              <div className="text-gray-500">— No changes</div>
            </div>
            <ArrowBigDownDashIcon className="size-6 self-center" />
            <div className="flex items-center gap-x-2 pl-1">
              <CheckIcon className="size-4 text-emerald-500" />
              <div className="flex size-6 items-center justify-center rounded-sm bg-white">
                <HiveLogo className="size-4/5" />
              </div>

              <div className="font-semibold text-[#adbac7]">
                {props.organizationSlug} &gt; schema:check &gt; {props.projectSlug} &gt; staging
              </div>
              <div className="text-gray-500">— No changes</div>
            </div>
          </div>
        </div>
        <Button
          disabled={ghCheckMutation.fetching}
          onClick={() => {
            void ghCheckMutate({
              input: {
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
              },
            }).then(
              result => {
                if (result.error) {
                  notify('Failed to enable', 'error');
                } else {
                  notify('Migration completed', 'success');
                }
              },
              _ => {
                notify('Failed to enable', 'error');
              },
            );
          }}
        >
          I want to migrate
        </Button>
      </div>
    </SubPageLayout>
  );
}

const ProjectSettingsPage_UpdateProjectSlugMutation = graphql(`
  mutation ProjectSettingsPage_UpdateProjectSlugMutation($input: UpdateProjectSlugInput!) {
    updateProjectSlug(input: $input) {
      ok {
        updatedProject {
          id
          slug
        }
      }
      error {
        message
      }
    }
  }
`);

const SlugFormSchema = z.object({
  slug: z
    .string({
      required_error: 'Project slug is required',
    })
    .min(1, 'Project slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and dashes'),
});

type SlugFormValues = z.infer<typeof SlugFormSchema>;

function ProjectSettingsPage_SlugForm(props: { organizationSlug: string; projectSlug: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const [_slugMutation, slugMutate] = useMutation(ProjectSettingsPage_UpdateProjectSlugMutation);

  const slugForm = useForm({
    mode: 'all',
    resolver: zodResolver(SlugFormSchema),
    defaultValues: {
      slug: props.projectSlug,
    },
  });

  const onSlugFormSubmit = useCallback(
    async (data: SlugFormValues) => {
      try {
        const result = await slugMutate({
          input: {
            project: {
              bySelector: {
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
              },
            },
            slug: data.slug,
          },
        });

        const error = result.error || result.data?.updateProjectSlug.error;

        if (result.data?.updateProjectSlug?.ok) {
          toast({
            variant: 'default',
            title: 'Success',
            description: 'Project slug updated',
          });
          void router.navigate({
            to: '/$organizationSlug/$projectSlug/view/settings',
            params: {
              organizationSlug: props.organizationSlug,
              projectSlug: result.data.updateProjectSlug.ok.updatedProject.slug,
            },
          });
        } else if (error) {
          slugForm.setError('slug', error);
        }
      } catch (error) {
        console.error('error', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update project slug',
        });
      }
    },
    [slugMutate],
  );

  return (
    <Form {...slugForm}>
      <form onSubmit={slugForm.handleSubmit(onSlugFormSubmit)}>
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Project Slug"
            description={
              <CardDescription>
                This is your project's URL namespace on Hive. Changing it{' '}
                <span className="font-bold">will</span> invalidate any existing links to your
                project.
                <br />
                <DocsLink
                  className="text-muted-foreground text-sm"
                  href="/management/projects#change-slug-of-a-project"
                >
                  You can read more about it in the documentation
                </DocsLink>
              </CardDescription>
            }
          />
          <div>
            <FormField
              control={slugForm.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="grid max-w-xl grid-cols-1 md:grid-cols-2">
                      <div className="border-input text-muted-foreground h-10 overflow-auto text-nowrap rounded-md border bg-gray-900 px-3 py-2 text-sm md:rounded-r-none md:border-r-0">
                        {env.appBaseUrl.replace(/https?:\/\//i, '')}/{props.organizationSlug}/
                      </div>
                      <Input placeholder="slug" className="rounded-l-none" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button disabled={slugForm.formState.isSubmitting} className="px-10" type="submit">
              Save
            </Button>
          </div>
        </SubPageLayout>
      </form>
    </Form>
  );
}

function ProjectDelete(props: { organizationSlug: string; projectSlug: string }) {
  const [isModalOpen, toggleModalOpen] = useToggle();

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Delete Project"
        description={
          <>
            <CardDescription>
              Deleting an project will delete all the targets, schemas and data associated with it.
            </CardDescription>
            <CardDescription>
              <DocsLink
                className="text-muted-foreground text-sm"
                href="/management/projects#delete-a-project"
              >
                <strong>This action is not reversible!</strong> You can find more information about
                this process in the documentation
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      <Button variant="destructive" onClick={toggleModalOpen}>
        Delete Project
      </Button>
      <DeleteProjectModal
        projectSlug={props.projectSlug}
        organizationSlug={props.organizationSlug}
        isOpen={isModalOpen}
        toggleModalOpen={toggleModalOpen}
      />
    </SubPageLayout>
  );
}

const ProjectPolicySettings_ProjectFragment = graphql(`
  fragment ProjectPolicySettings_ProjectFragment on Project {
    id
    slug
    schemaPolicy {
      id
      updatedAt
      ...PolicySettings_SchemaPolicyFragment
    }
    parentSchemaPolicy {
      id
      updatedAt
      allowOverrides
      rules {
        rule {
          id
        }
      }
    }
    viewerCanModifySchemaPolicy
  }
`);

const UpdateSchemaPolicyForProject = graphql(`
  mutation UpdateSchemaPolicyForProject(
    $selector: ProjectSelectorInput!
    $policy: SchemaPolicyInput!
  ) {
    updateSchemaPolicyForProject(selector: $selector, policy: $policy) {
      error {
        message
      }
      ok {
        project {
          id
          schemaPolicy {
            id
            updatedAt
            ...PolicySettings_SchemaPolicyFragment
          }
        }
      }
    }
  }
`);

function ProjectPolicySettings(props: {
  organizationSlug: string;
  project: FragmentType<typeof ProjectPolicySettings_ProjectFragment>;
}) {
  const [mutation, mutate] = useMutation(UpdateSchemaPolicyForProject);
  const { toast } = useToast();

  const currentProject = useFragment(ProjectPolicySettings_ProjectFragment, props.project);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Rules"
        description={
          <>
            <CardDescription>
              At the project level, policies can be defined to affect all targets, and override
              policy configuration defined at the organization level.
            </CardDescription>
            <CardDescription>
              <DocsLink href="/features/schema-policy" className="text-muted-foreground text-sm">
                Learn more
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      {currentProject.parentSchemaPolicy === null ||
      currentProject.parentSchemaPolicy?.allowOverrides ? (
        <PolicySettings
          saving={mutation.fetching}
          rulesInParent={currentProject.parentSchemaPolicy?.rules.map(r => r.rule.id)}
          error={
            mutation.error?.message || mutation.data?.updateSchemaPolicyForProject.error?.message
          }
          onSave={
            currentProject?.viewerCanModifySchemaPolicy
              ? async newPolicy => {
                  await mutate({
                    selector: {
                      organizationSlug: props.organizationSlug,
                      projectSlug: currentProject.slug,
                    },
                    policy: newPolicy,
                  }).then(result => {
                    if (result.error || result.data?.updateSchemaPolicyForProject.error) {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description:
                          result.error?.message ||
                          result.data?.updateSchemaPolicyForProject.error?.message,
                      });
                    } else {
                      toast({
                        variant: 'default',
                        title: 'Success',
                        description: 'Policy updated successfully',
                      });
                    }
                  });
                }
              : null
          }
          currentState={currentProject.schemaPolicy}
        />
      ) : (
        <div className="pl-1 text-sm font-bold text-gray-400">
          <p className="mr-4 inline-block text-orange-500">!</p>
          Organization settings does not allow projects to override policy. Please consult your
          organization administrator.
        </div>
      )}
    </SubPageLayout>
  );
}

const ProjectSettingsPage_OrganizationFragment = graphql(`
  fragment ProjectSettingsPage_OrganizationFragment on Organization {
    id
    slug
    ...CompositionSettings_OrganizationFragment
  }
`);

const ProjectSettingsPage_ProjectFragment = graphql(`
  fragment ProjectSettingsPage_ProjectFragment on Project {
    id
    slug
    type
    isProjectNameInGitHubCheckEnabled
    viewerCanDelete
    viewerCanModifySettings
    ...CompositionSettings_ProjectFragment
    ...ProjectPolicySettings_ProjectFragment
  }
`);

const ProjectSettingsPageQuery = graphql(`
  query ProjectSettingsPageQuery($organizationSlug: String!, $projectSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      ...ProjectSettingsPage_OrganizationFragment
      project: projectBySlug(projectSlug: $projectSlug) {
        ...ProjectSettingsPage_ProjectFragment
      }
    }
    isGitHubIntegrationFeatureEnabled
  }
`);

function ProjectSettingsContent(props: {
  organizationSlug: string;
  projectSlug: string;
  page?: ProjectSettingsSubPage;
}) {
  const router = useRouter();
  const [query] = useQuery({
    query: ProjectSettingsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
    },
    requestPolicy: 'cache-and-network',
  });

  const currentOrganization = query.data?.organization;
  const currentProject = currentOrganization?.project;

  const organization = useFragment(ProjectSettingsPage_OrganizationFragment, currentOrganization);
  const project = useFragment(ProjectSettingsPage_ProjectFragment, currentProject);

  // Verify wether user is allowed to access the settings
  // Otherwise redirect to the project overview.
  useRedirect({
    canAccess: project?.viewerCanModifySettings === true,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
        },
      });
    },
    entity: project,
  });

  const subPages = useMemo(() => {
    const pages: Array<{
      key: ProjectSettingsSubPage;
      title: string;
    }> = [];

    if (project?.viewerCanModifySettings) {
      pages.push({
        key: 'general',
        title: 'General',
      });
    }

    pages.push({
      key: 'policy',
      title: 'Policy',
    });

    return pages;
  }, [project]);

  const resolvedPage = props.page ? subPages.find(page => page.key === props.page) : subPages.at(0);

  if (!resolvedPage || !organization || !project) {
    return null;
  }

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  return (
    <PageLayout>
      <NavLayout>
        {subPages.map(subPage => (
          <Button
            key={subPage.key}
            variant="ghost"
            onClick={() => {
              void router.navigate({
                search: {
                  page: subPage.key,
                },
              });
            }}
            className={cn(
              resolvedPage.key === subPage.key
                ? 'bg-muted hover:bg-muted'
                : 'hover:bg-transparent hover:underline',
              'w-full justify-start text-left',
            )}
          >
            {subPage.title}
          </Button>
        ))}
      </NavLayout>
      <PageLayoutContent>
        <div className="space-y-12">
          {resolvedPage.key === 'general' ? (
            <>
              <ResourceDetails id={project.id} />
              <ProjectSettingsPage_SlugForm
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
              />
              {query.data?.isGitHubIntegrationFeatureEnabled &&
              !project.isProjectNameInGitHubCheckEnabled ? (
                <GitHubIntegration
                  organizationSlug={organization.slug}
                  projectSlug={project.slug}
                />
              ) : null}

              {project.type === ProjectType.Federation ? (
                <CompositionSettings project={project} organization={organization} />
              ) : null}

              {project.viewerCanDelete ? (
                <ProjectDelete projectSlug={project.slug} organizationSlug={organization.slug} />
              ) : null}
            </>
          ) : null}
          {resolvedPage.key === 'policy' ? (
            <ProjectPolicySettings organizationSlug={organization.slug} project={project} />
          ) : null}
        </div>
      </PageLayoutContent>
    </PageLayout>
  );
}

export const ProjectSettingsPageEnum = z.enum(['general', 'policy']);

export type ProjectSettingsSubPage = z.TypeOf<typeof ProjectSettingsPageEnum>;

export function ProjectSettingsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  page?: ProjectSettingsSubPage;
}) {
  return (
    <>
      <Meta title="Project settings" />
      <ProjectLayout
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        page={Page.Settings}
        className="flex flex-col gap-y-10"
      >
        <ProjectSettingsContent
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          page={props.page}
        />
      </ProjectLayout>
    </>
  );
}

export const DeleteProjectMutation = graphql(`
  mutation deleteProject($selector: ProjectSelectorInput!) {
    deleteProject(input: { project: { bySelector: $selector } }) {
      ok {
        deletedProjectId
      }
    }
  }
`);

export function DeleteProjectModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
  projectSlug: string;
}) {
  const { organizationSlug, projectSlug } = props;
  const [, mutate] = useMutation(DeleteProjectMutation);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    const { error } = await mutate({
      selector: {
        organizationSlug,
        projectSlug,
      },
    });

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete project',
        description: error.message,
      });
    } else {
      toast({
        title: 'Project deleted',
        description: 'The project has been successfully deleted.',
      });
      props.toggleModalOpen();
      void router.navigate({
        to: '/$organizationSlug',
        params: {
          organizationSlug,
        },
      });
    }
  };

  return (
    <DeleteProjectModalContent
      isOpen={props.isOpen}
      toggleModalOpen={props.toggleModalOpen}
      handleDelete={handleDelete}
    />
  );
}

export function DeleteProjectModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  handleDelete: () => void;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="w-4/5 max-w-[520px] md:w-3/5">
        <DialogHeader>
          <DialogTitle>Delete project</DialogTitle>
          <DialogDescription>
            Every target and its published schema, reported data, and settings associated with this
            project will be permanently deleted.
          </DialogDescription>
          <DialogDescription className="font-bold">This action is irreversible!</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={ev => {
              ev.preventDefault();
              props.toggleModalOpen();
            }}
          >
            Cancel
          </Button>
          <Button variant="destructive" onClick={props.handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
