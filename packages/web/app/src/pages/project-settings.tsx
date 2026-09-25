import { ReactElement, useCallback, useMemo } from 'react';
import { ArrowBigDownDashIcon, CheckIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { Navigation } from '@/components/base/navigation/navigation';
import { AlertDialog } from '@/components/base/overlays/alert-dialog/alert-dialog';
import { useToast } from '@/components/base/toast/toast';
import { SlugForm, slugFormSchema, type SlugFormValues } from '@/components/common/slug-form';
import { LayoutContent } from '@/components/layouts/layout-content';
import { PolicySettings } from '@/components/policy/policy-settings';
import { CompositionSettings } from '@/components/project/settings/composition';
import { HiveLogo } from '@/components/ui/brand-icon';
import { Meta } from '@/components/ui/meta';
import {
  PageLayout,
  PageLayoutContent,
  SubPageLayout,
  SubPageLayoutHeader,
} from '@/components/ui/page-content-layout';
import { QueryError } from '@/components/ui/query-error';
import { ResourceDetails } from '@/components/ui/resource-details';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { getDocsUrl } from '@/lib/docs-url';
import { useSlugs, useToggle } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Outlet,
  useChildMatches,
  useRouter,
  type RegisteredRouter,
  type RouteIds,
} from '@tanstack/react-router';

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

function GitHubIntegration(): ReactElement | null {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const href = getDocsUrl('integrations/ci-cd#github-workflow-for-ci');
  const { toast } = useToast();
  const [integrationQuery] = useQuery({
    query: GithubIntegration_GithubIntegrationDetailsQuery,
    variables: {
      organizationSlug,
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
          <p>
            Prevents GitHub Check name collisions when running{' '}
            <code className="text-xs">$ hive schema:check --github</code> for more than one project.
          </p>
        }
        docsLink={{
          href,
          text: 'Learn more',
        }}
      />
      <div>
        <div className="text-neutral-10 text-sm">
          <div>Here's how it will look like in your CI pipeline.</div>
          <div className="my-8 flex w-fit flex-col gap-y-1">
            <div className="flex items-center gap-x-2 pl-1">
              <CheckIcon className="text-success size-4" />
              <div className="bg-neutral-12 flex size-6 items-center justify-center rounded-sm">
                <HiveLogo className="size-4/5" />
              </div>

              <div className="text-fg-default font-semibold">
                {organizationSlug} &gt; schema:check &gt; staging
              </div>
              <div className="text-neutral-10">— No changes</div>
            </div>
            <ArrowBigDownDashIcon className="size-6 self-center" />
            <div className="flex items-center gap-x-2 pl-1">
              <CheckIcon className="text-success size-4" />
              <div className="bg-neutral-12 flex size-6 items-center justify-center rounded-sm">
                <HiveLogo className="size-4/5" />
              </div>

              <div className="text-fg-default font-semibold">
                {organizationSlug} &gt; schema:check &gt; {projectSlug} &gt; staging
              </div>
              <div className="text-neutral-10">— No changes</div>
            </div>
          </div>
        </div>
        <Button
          disabled={ghCheckMutation.fetching}
          onClick={() => {
            void ghCheckMutate({
              input: {
                organizationSlug,
                projectSlug,
              },
            }).then(
              result => {
                if (result.error) {
                  toast({ variant: 'destructive', title: 'Failed to enable' });
                } else {
                  toast({ title: 'Migration completed' });
                }
              },
              _ => {
                toast({ variant: 'destructive', title: 'Failed to enable' });
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

function ProjectSettingsPage_SlugForm() {
  const { organizationSlug, projectSlug } = useSlugs('project');
  const { toast } = useToast();
  const router = useRouter();
  const [_slugMutation, slugMutate] = useMutation(ProjectSettingsPage_UpdateProjectSlugMutation);

  const slugForm = useForm({
    mode: 'all',
    resolver: zodResolver(slugFormSchema('Project')),
    defaultValues: {
      slug: projectSlug,
    },
  });

  const onSlugFormSubmit = useCallback(
    async (data: SlugFormValues) => {
      try {
        const result = await slugMutate({
          input: {
            project: {
              bySelector: {
                organizationSlug,
                projectSlug,
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
              organizationSlug,
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
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Project Slug"
        description={
          <p>
            This is your project's URL namespace on Hive. Changing it{' '}
            <span className="font-bold">will invalidate</span> any existing links to your project.
            <br />
          </p>
        }
        docsLink={{
          href: '/schema-registry/management/projects#change-slug-of-a-project',
          text: 'Read more in the documentation',
        }}
      />
      <SlugForm
        form={slugForm}
        onSubmit={onSlugFormSubmit}
        prefixText={`${env.appBaseUrl.replace(/https?:\/\//i, '')}/${organizationSlug}/`}
      />
    </SubPageLayout>
  );
}

function ProjectDelete() {
  const [isModalOpen, toggleModalOpen] = useToggle();

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Delete Project"
        description={
          <p>
            Deleting an project will delete all the targets, schemas and data associated with it.{' '}
            <strong>This action is not reversible!</strong>
          </p>
        }
        docsLink={{
          href: '/schema-registry/management/projects#delete-a-project',
          text: 'Read more in the documentation',
        }}
      />
      <Button variant="destructive" onClick={toggleModalOpen}>
        Delete Project
      </Button>
      <DeleteProjectModal isOpen={isModalOpen} toggleModalOpen={toggleModalOpen} />
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
  project: FragmentType<typeof ProjectPolicySettings_ProjectFragment>;
}) {
  const { organizationSlug } = useSlugs('project');
  const [mutation, mutate] = useMutation(UpdateSchemaPolicyForProject);
  const { toast } = useToast();

  const currentProject = useFragment(ProjectPolicySettings_ProjectFragment, props.project);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Rules"
        description="At the project level, policies can be defined to affect all targets, and override policy configuration defined at the organization level."
        docsLink={{
          href: '/features/schema-policy',
          text: 'Learn more',
        }}
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
                      organizationSlug,
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
        <div className="text-neutral-10 pl-1 text-sm font-bold">
          <p className="text-neutral-2 mr-4 inline-block">!</p>
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
    viewerCanManageProjectAccessTokens
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

const SETTINGS = '/authenticated/$organizationSlug/$projectSlug/view/settings';

type SectionId = 'general' | 'policy' | 'composition' | 'access-tokens';

type Section = {
  id: SectionId;
  label: string;
  routeId: RouteIds<RegisteredRouter['routeTree']>;
  to: `/$organizationSlug/$projectSlug/view/settings${'' | `/${Exclude<SectionId, 'general'>}`}`;
  exact?: boolean;
};

/**
 * The sections in nav order, with the route each renders under; the permission gate compares the
 * matched child route against the items the viewer may see. The bare URL is General.
 */
const sections: readonly Section[] = [
  {
    id: 'general',
    label: 'General',
    routeId: `${SETTINGS}/`,
    to: '/$organizationSlug/$projectSlug/view/settings',
    exact: true,
  },
  {
    id: 'policy',
    label: 'Policy',
    routeId: `${SETTINGS}/policy`,
    to: '/$organizationSlug/$projectSlug/view/settings/policy',
  },
  {
    id: 'composition',
    label: 'Composition',
    routeId: `${SETTINGS}/composition`,
    to: '/$organizationSlug/$projectSlug/view/settings/composition',
  },
  {
    id: 'access-tokens',
    label: 'Access Tokens',
    routeId: `${SETTINGS}/access-tokens`,
    to: '/$organizationSlug/$projectSlug/view/settings/access-tokens',
  },
];

function useProjectSettings(requestPolicy?: 'cache-and-network') {
  const [query] = useQuery({
    query: ProjectSettingsPageQuery,
    variables: useSlugs('project'),
    requestPolicy,
  });
  const organization = useFragment(
    ProjectSettingsPage_OrganizationFragment,
    query.data?.organization,
  );
  const project = useFragment(
    ProjectSettingsPage_ProjectFragment,
    query.data?.organization?.project,
  );
  return { query, organization, project };
}

export function ProjectSettingsPage() {
  const slugs = useSlugs('project');
  const { organizationSlug } = useSlugs('project');
  // Fresh on entry; the sections read the same document from the cache.
  const { query, project } = useProjectSettings('cache-and-network');

  useRedirect({
    canAccess:
      project?.viewerCanModifySettings === true ||
      project?.viewerCanManageProjectAccessTokens === true,
    entity: project,
    redirectTo: router => {
      void router.navigate({ to: '/$organizationSlug/$projectSlug', params: slugs });
    },
  });

  const visible = useMemo(() => {
    const ids = new Set<SectionId>(['policy']);
    if (project?.viewerCanModifySettings) {
      ids.add('general');
    }
    if (project?.type === ProjectType.Federation) {
      ids.add('composition');
    }
    if (project?.viewerCanManageProjectAccessTokens) {
      ids.add('access-tokens');
    }
    return sections.filter(section => ids.has(section.id));
  }, [project]);

  const sectionRouteId = useChildMatches({ select: matches => matches.at(-1)?.routeId });
  const allowed = visible.some(section => section.routeId === sectionRouteId);

  // A section the viewer may not open falls back to the first one they may, else the project.
  useRedirect({
    canAccess: allowed,
    entity: project,
    redirectTo: router => {
      const fallback = visible.at(0);
      void router.navigate(
        fallback
          ? { to: fallback.to, params: slugs, replace: true }
          : { to: '/$organizationSlug/$projectSlug', params: slugs, replace: true },
      );
    },
  });

  if (query.error) {
    return (
      <LayoutContent>
        <QueryError
          organizationSlug={organizationSlug}
          error={query.error}
          showLogoutButton={false}
        />
      </LayoutContent>
    );
  }

  return (
    <>
      <Meta title="Project settings" />
      <LayoutContent className="flex flex-col gap-y-10">
        {allowed && project ? (
          <PageLayout>
            <Navigation
              aria-label="Settings"
              variant="list"
              items={visible.map(section => ({
                id: section.id,
                label: section.label,
                to: section.to,
                params: slugs,
                exact: section.exact,
              }))}
            />
            <PageLayoutContent>
              <div className="space-y-12">
                <Outlet />
              </div>
            </PageLayoutContent>
          </PageLayout>
        ) : null}
      </LayoutContent>
    </>
  );
}

export function ProjectSettingsGeneralSection() {
  const { query, organization, project } = useProjectSettings();
  if (!organization || !project) {
    return null;
  }
  return (
    <>
      <ResourceDetails id={project.id} label="Project ID" />
      <ProjectSettingsPage_SlugForm />
      {query.data?.isGitHubIntegrationFeatureEnabled &&
      !project.isProjectNameInGitHubCheckEnabled ? (
        <GitHubIntegration />
      ) : null}
      {project.viewerCanDelete ? <ProjectDelete /> : null}
    </>
  );
}

export function ProjectSettingsPolicySection() {
  const { organization, project } = useProjectSettings();
  if (!organization || !project) {
    return null;
  }
  return <ProjectPolicySettings project={project} />;
}

export function ProjectSettingsCompositionSection() {
  const { organization, project } = useProjectSettings();
  if (!organization || !project) {
    return null;
  }
  return <CompositionSettings project={project} organization={organization} />;
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

export function DeleteProjectModal(props: { isOpen: boolean; toggleModalOpen: () => void }) {
  const { organizationSlug, projectSlug } = useSlugs('project');
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
    <AlertDialog
      open={props.isOpen}
      onOpenChange={props.toggleModalOpen}
      title="Delete project"
      description={
        <>
          Every target and its published schema, reported data, and settings associated with this
          project will be permanently deleted.
          <br />
          <strong>This action is irreversible!</strong>
        </>
      }
      confirm={{ label: 'Delete', variant: 'destructive', onClick: props.handleDelete }}
    />
  );
}
