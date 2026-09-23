import { ReactElement, ReactNode } from 'react';
import { PlusIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Button } from '@/components/base/button/button';
import { NotFound } from '@/components/base/not-found/not-found';
import { Dialog } from '@/components/base/overlays/dialog/dialog';
import { useToast } from '@/components/base/toast/toast';
import { Header } from '@/components/navigation/header';
import { SecondaryNavigation } from '@/components/navigation/secondary-navigation';
import {
  CreateProjectForm,
  CreateProjectFormSchema,
  type CreateProjectFormValues,
} from '@/components/project/create-project-form';
import { UserMenu } from '@/components/ui/user-menu';
import { graphql } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { getIsStripeEnabled } from '@/lib/billing/stripe-public-key';
import { useToggle } from '@/lib/hooks';
import { useLastVisitedOrganizationWriter } from '@/lib/last-visited-org';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';
import { ProPlanBilling } from '../organization/billing/ProPlanBillingWarm';
import { RateLimitWarn } from '../organization/billing/RateLimitWarn';
import { HiveLink } from '../ui/hive-link';
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
                <span className="flex items-center">
                  <PlusIcon size={16} className="mr-2" />
                  New project
                </span>
              </Button>
              <CreateProjectModal
                organizationSlug={organizationSlug}
                isOpen={isModalOpen}
                toggleModalOpen={toggleModalOpen}
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
          <NotFound
            title="Organization not found"
            description="Use the empty dropdown in the header to select an organization to which you have access."
            showBackButton={false}
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

function CreateProjectModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
}) {
  const [_, mutate] = useMutation(CreateProjectMutation);
  const router = useRouter();
  const { toast } = useToast();

  const form = useForm<CreateProjectFormValues>({
    mode: 'onChange',
    resolver: zodResolver(CreateProjectFormSchema),
    defaultValues: {
      projectSlug: '',
      projectType: ProjectType.Single,
    },
  });

  async function onSubmit(values: CreateProjectFormValues) {
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
    <Dialog
      open={props.isOpen}
      onOpenChange={props.toggleModalOpen}
      // The form clears once the close transition has finished, rather than on toggle, which
      // would blank it mid-fade, or by remounting, which would skip the transitions.
      onOpenChangeComplete={open => {
        if (!open) {
          form.reset();
        }
      }}
      width="lg"
      title="Create a project"
      description={
        <>
          A Hive <span className="text-neutral-12 font-medium">project</span> represents a{' '}
          <span className="text-neutral-12 font-medium">GraphQL API</span> running a GraphQL schema.
        </>
      }
    >
      <CreateProjectForm form={form} onSubmit={onSubmit} />
    </Dialog>
  );
}
