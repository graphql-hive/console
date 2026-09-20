import { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { NotFound, resourceAccessDescription } from '@/components/base/not-found/not-found';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { Header } from '@/components/navigation/header';
import { SecondaryNavigation } from '@/components/navigation/secondary-navigation';
import {
  CreateTargetForm,
  CreateTargetFormSchema,
  type CreateTargetFormValues,
} from '@/components/target/create-target-form';
import { Button } from '@/components/ui/button';
import { UserMenu } from '@/components/ui/user-menu';
import { graphql } from '@/gql';
import { useToggle } from '@/lib/hooks';
import { useLastVisitedOrganizationWriter } from '@/lib/last-visited-org';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';
import { LegacyCompositionWarn } from '../project/LegacyCompositionWarn';
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
        ...LegacyCompositionWarn_ProjectFragment
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
        <NotFound
          variants={{ layout: 'horizontal', illustration: 'connection' }}
          title="404 - This project does not seem to exist."
          description={resourceAccessDescription}
        />
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
            {currentProject ? (
              <LegacyCompositionWarn organizationSlug={organizationSlug} project={currentProject} />
            ) : null}
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

  const form = useForm<CreateTargetFormValues>({
    mode: 'onChange',
    resolver: zodResolver(CreateTargetFormSchema),
    defaultValues: {
      targetSlug: '',
    },
  });

  async function onSubmit(values: CreateTargetFormValues) {
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
    <Dialog
      open={props.isOpen}
      onOpenChange={props.toggleModalOpen}
      title="Create a new target"
      description={
        <>
          A project is built on top of <b>Targets</b>, which are just your environments.
        </>
      }
    >
      <CreateTargetForm form={form} onSubmit={onSubmit} />
    </Dialog>
  );
}
