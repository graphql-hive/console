import { useCallback, useMemo } from 'react';
import { ArrowRightIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { OrganizationLayout, Page } from '@/components/layouts/organization';
import { AccessTokensSubPage } from '@/components/organization/settings/access-tokens/access-tokens-sub-page';
import { OIDCIntegrationSection } from '@/components/organization/settings/oidc-integration-section';
import { PersonalAccessTokensSubPage } from '@/components/organization/settings/personal-access-tokens/personal-access-tokens-sub-page';
import { PolicySettings } from '@/components/policy/policy-settings';
import { Button } from '@/components/ui/button';
import { CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { GitHubIcon, SlackIcon } from '@/components/ui/icon';
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
import { TransferOrganizationOwnershipModal } from '@/components/v2/modals';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useRedirect } from '@/lib/access/common';
import { useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from '@tanstack/react-router';

const DeleteSlackIntegrationMutation = graphql(`
  mutation Integrations_DeleteSlackIntegration($input: OrganizationSelectorInput!) {
    deleteSlackIntegration(input: $input) {
      organization {
        id
        hasSlackIntegration
      }
    }
  }
`);

const DeleteGitHubIntegrationMutation = graphql(`
  mutation Integrations_DeleteGitHubIntegration($input: OrganizationSelectorInput!) {
    deleteGitHubIntegration(input: $input) {
      organization {
        id
        hasGitHubIntegration
      }
    }
  }
`);

const GitHubIntegrationSection_OrganizationFragment = graphql(`
  fragment GitHubIntegrationSection_OrganizationFragment on Organization {
    hasGitHubIntegration
    slug
  }
`);

function GitHubIntegrationSection(props: {
  organization: FragmentType<typeof GitHubIntegrationSection_OrganizationFragment>;
}) {
  const [deleteGitHubMutation, deleteGitHub] = useMutation(DeleteGitHubIntegrationMutation);
  const organization = useFragment(
    GitHubIntegrationSection_OrganizationFragment,
    props.organization,
  );

  return organization.hasGitHubIntegration ? (
    <div className="flex flex-row justify-start gap-3">
      <Button
        variant="destructive"
        disabled={deleteGitHubMutation.fetching}
        onClick={async () => {
          await deleteGitHub({
            input: {
              organizationSlug: organization.slug,
            },
          });
        }}
      >
        <GitHubIcon className="mr-2" />
        Disconnect GitHub
      </Button>
      <Button variant="destructive" asChild>
        <a href={`/api/github/connect/${organization.slug}`}>Adjust permissions</a>
      </Button>
    </div>
  ) : (
    <Button variant="default" asChild>
      <a href={`/api/github/connect/${organization.slug}`}>
        <GitHubIcon className="mr-2" />
        Connect GitHub
      </a>
    </Button>
  );
}

const SlackIntegrationSection_OrganizationFragment = graphql(`
  fragment SlackIntegrationSection_OrganizationFragment on Organization {
    hasSlackIntegration
    slug
  }
`);

function SlackIntegrationSection(props: {
  organization: FragmentType<typeof SlackIntegrationSection_OrganizationFragment>;
}) {
  const [deleteSlackMutation, deleteSlack] = useMutation(DeleteSlackIntegrationMutation);
  const organization = useFragment(
    SlackIntegrationSection_OrganizationFragment,
    props.organization,
  );

  return organization.hasSlackIntegration ? (
    <Button
      variant="destructive"
      disabled={deleteSlackMutation.fetching}
      onClick={async () => {
        await deleteSlack({
          input: {
            organizationSlug: organization.slug,
          },
        });
      }}
    >
      <SlackIcon className="mr-2" />
      Disconnect Slack
    </Button>
  ) : (
    <Button variant="default" asChild>
      <a href={`/api/slack/connect/${organization.slug}`}>
        <SlackIcon className="mr-2" />
        Connect Slack
      </a>
    </Button>
  );
}

const UpdateOrganizationSlugMutation = graphql(`
  mutation Settings_UpdateOrganizationSlug($input: UpdateOrganizationSlugInput!) {
    updateOrganizationSlug(input: $input) {
      ok {
        updatedOrganizationPayload {
          selector {
            organizationSlug
          }
          organization {
            id
            slug
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const SettingsPageRenderer_OrganizationFragment = graphql(`
  fragment SettingsPageRenderer_OrganizationFragment on Organization {
    id
    slug
    viewerCanDelete
    viewerCanTransferOwnership
    viewerCanModifySlug
    viewerCanManageOIDCIntegration
    viewerCanModifySlackIntegration
    viewerCanModifyGitHubIntegration
    viewerCanExportAuditLogs
    ...OIDCIntegrationSection_OrganizationFragment
    ...TransferOrganizationOwnershipModal_OrganizationFragment
    ...GitHubIntegrationSection_OrganizationFragment
    ...SlackIntegrationSection_OrganizationFragment
  }
`);

const SlugFormSchema = z.object({
  slug: z
    .string({
      required_error: 'Organization slug is required',
    })
    .min(1, 'Organization slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and dashes'),
});

type SlugFormValues = z.infer<typeof SlugFormSchema>;

const OrganizationSettingsContent = (props: {
  organization: FragmentType<typeof SettingsPageRenderer_OrganizationFragment>;
  organizationSlug: string;
}) => {
  const organization = useFragment(SettingsPageRenderer_OrganizationFragment, props.organization);
  const router = useRouter();
  const [isDeleteModalOpen, toggleDeleteModalOpen] = useToggle();
  const [isTransferModalOpen, toggleTransferModalOpen] = useToggle();
  const [isAuditLogsModalOpen, toggleAuditLogsModalOpen] = useToggle();
  const { toast } = useToast();

  const [_slugMutation, slugMutate] = useMutation(UpdateOrganizationSlugMutation);

  const slugForm = useForm({
    mode: 'all',
    resolver: zodResolver(SlugFormSchema),
    defaultValues: {
      slug: organization.slug,
    },
  });

  const onSlugFormSubmit = useCallback(
    async (data: SlugFormValues) => {
      try {
        const result = await slugMutate({
          input: {
            organizationSlug: props.organizationSlug,
            slug: data.slug,
          },
        });

        const error = result.error || result.data?.updateOrganizationSlug.error;

        if (result.data?.updateOrganizationSlug?.ok) {
          toast({
            variant: 'default',
            title: 'Success',
            description: 'Organization slug updated',
          });
          void router.navigate({
            to: '/$organizationSlug/view/settings',
            params: {
              organizationSlug:
                result.data.updateOrganizationSlug.ok.updatedOrganizationPayload.organization.slug,
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
          description: 'Failed to update organization slug',
        });
      }
    },
    [slugMutate, props.organizationSlug],
  );

  return (
    <div className="space-y-12">
      <ResourceDetails id={organization.id} label="Organization ID" />
      {organization.viewerCanModifySlug && (
        <Form {...slugForm}>
          <form onSubmit={slugForm.handleSubmit(onSlugFormSubmit)}>
            <SubPageLayout>
              <SubPageLayoutHeader
                subPageTitle="Organization Slug"
                description={
                  <>
                    <CardDescription>
                      This is your organization's URL namespace on GraphQL Hive. Changing it{' '}
                      <span className="font-bold">will</span> invalidate any existing links to your
                      organization.
                    </CardDescription>
                    <CardDescription>
                      <DocsLink
                        className="text-neutral-10 text-sm"
                        href="/management/organizations#change-slug-of-organization"
                      >
                        You can read more about it in the documentation
                      </DocsLink>
                    </CardDescription>
                  </>
                }
              />
              <FormField
                control={slugForm.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="flex items-center">
                        <div className="border-neutral-5 text-neutral-10 h-10 rounded-md rounded-r-none border-y border-l bg-gray-900 px-3 py-2 text-sm">
                          {env.appBaseUrl.replace(/https?:\/\//i, '')}/
                        </div>
                        <Input placeholder="slug" className="w-48 rounded-l-none" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button disabled={slugForm.formState.isSubmitting} className="px-10" type="submit">
                Save
              </Button>
            </SubPageLayout>
          </form>
        </Form>
      )}

      {organization.viewerCanManageOIDCIntegration && (
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Single Sign On Provider"
            description={
              <>
                <CardDescription>
                  Link your Hive organization to a single-sign-on provider such as Okta or Microsoft
                  Entra ID via OpenID Connect.
                </CardDescription>
                <CardDescription>
                  <DocsLink
                    className="text-neutral-10 text-sm"
                    href="/management/sso-oidc-provider"
                  >
                    Instructions for connecting your provider.
                  </DocsLink>
                </CardDescription>
              </>
            }
          />
          <div className="text-neutral-10">
            <OIDCIntegrationSection organization={organization} />
          </div>
        </SubPageLayout>
      )}

      {organization.viewerCanModifySlackIntegration && (
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Slack Integration"
            description={
              <>
                <CardDescription>
                  Link your Hive organization with Slack for schema change notifications.
                </CardDescription>
                <CardDescription>
                  <DocsLink
                    className="text-neutral-10 text-sm"
                    href="/management/organizations#slack"
                  >
                    Learn more.
                  </DocsLink>
                </CardDescription>
              </>
            }
          />
          <SlackIntegrationSection organization={organization} />
        </SubPageLayout>
      )}

      {organization.viewerCanModifyGitHubIntegration && (
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="GitHub Integration"
            description={
              <>
                <CardDescription>Link your Hive organization with GitHub.</CardDescription>
                <CardDescription>
                  <DocsLink
                    className="text-neutral-10 text-sm"
                    href="/management/organizations#github"
                  >
                    Learn more.
                  </DocsLink>
                </CardDescription>
              </>
            }
          />
          <GitHubIntegrationSection organization={organization} />
        </SubPageLayout>
      )}

      {organization.viewerCanTransferOwnership && (
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Transfer Ownership"
            description={
              <>
                <CardDescription>
                  <strong>You are currently the owner of the organization.</strong> You can transfer
                  the organization to another member of the organization, or to an external user.
                </CardDescription>
                <CardDescription>
                  <DocsLink
                    className="text-neutral-10 text-sm"
                    href="/management/organizations#transfer-ownership"
                  >
                    Learn more about the process
                  </DocsLink>
                </CardDescription>
              </>
            }
          />
          <Button variant="destructive" onClick={toggleTransferModalOpen} className="px-5">
            Transfer Ownership
          </Button>
          <TransferOrganizationOwnershipModal
            isOpen={isTransferModalOpen}
            toggleModalOpen={toggleTransferModalOpen}
            organization={organization}
          />
        </SubPageLayout>
      )}

      {organization.viewerCanDelete && (
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Delete Organization"
            description={
              <>
                <CardDescription>
                  Deleting an organization will delete all the projects, targets, schemas and data
                  associated with it.
                </CardDescription>
                <CardDescription>
                  <DocsLink
                    className="text-neutral-10 text-sm"
                    href="/management/organizations#delete-an-organization"
                  >
                    <span>
                      <strong>This action is not reversible!</strong> You can find more information
                      about this process in the documentation
                    </span>
                  </DocsLink>
                </CardDescription>
              </>
            }
          />
          <Button variant="destructive" onClick={toggleDeleteModalOpen} className="px-5">
            Delete Organization
          </Button>
          <DeleteOrganizationModal
            organizationSlug={props.organizationSlug}
            isOpen={isDeleteModalOpen}
            toggleModalOpen={toggleDeleteModalOpen}
          />
        </SubPageLayout>
      )}

      {organization.viewerCanExportAuditLogs && (
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Audit Logs"
            description={
              <>
                <CardDescription>
                  View a history of changes made to the organization settings.
                </CardDescription>
                <CardDescription>
                  <DocsLink className="text-neutral-10 text-sm" href="/management/audit-logs">
                    Learn more.
                  </DocsLink>
                </CardDescription>
              </>
            }
          />
          <Button variant="default" onClick={toggleAuditLogsModalOpen} className="px-5">
            Export Audit Logs
          </Button>
          <AuditLogsOrganizationModal
            organizationSlug={organization.slug}
            isOpen={isAuditLogsModalOpen}
            toggleModalOpen={toggleAuditLogsModalOpen}
          />
        </SubPageLayout>
      )}
    </div>
  );
};

const OrganizationPolicySettings_OrganizationFragment = graphql(`
  fragment OrganizationPolicySettings_OrganizationFragment on Organization {
    id
    slug
    schemaPolicy {
      id
      updatedAt
      ...PolicySettings_SchemaPolicyFragment
    }
    viewerCanModifySchemaPolicy
  }
`);

const UpdateSchemaPolicyForOrganization = graphql(`
  mutation UpdateSchemaPolicyForOrganization(
    $selector: OrganizationSelectorInput!
    $policy: SchemaPolicyInput!
    $allowOverrides: Boolean!
  ) {
    updateSchemaPolicyForOrganization(
      selector: $selector
      policy: $policy
      allowOverrides: $allowOverrides
    ) {
      error {
        message
      }
      ok {
        organization {
          id
          schemaPolicy {
            id
            updatedAt
            allowOverrides
            ...PolicySettings_SchemaPolicyFragment
          }
        }
      }
    }
  }
`);

function OrganizationPolicySettings(props: {
  organization: FragmentType<typeof OrganizationPolicySettings_OrganizationFragment>;
}) {
  const [mutation, mutate] = useMutation(UpdateSchemaPolicyForOrganization);
  const { toast } = useToast();

  const currentOrganization = useFragment(
    OrganizationPolicySettings_OrganizationFragment,
    props.organization,
  );

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Rules"
        description={
          <CardDescription>
            At the organizational level, policies can be defined to affect all projects and targets.
            <br />
            At the project level, policies can be overridden or extended.
            <br />
            <DocsLink className="text-neutral-10" href="/features/schema-policy">
              Learn more
            </DocsLink>
          </CardDescription>
        }
      />
      <PolicySettings
        saving={mutation.fetching}
        error={
          mutation.error?.message || mutation.data?.updateSchemaPolicyForOrganization.error?.message
        }
        onSave={
          currentOrganization.viewerCanModifySchemaPolicy
            ? async (newPolicy, allowOverrides) => {
                await mutate({
                  selector: {
                    organizationSlug: currentOrganization.slug,
                  },
                  policy: newPolicy,
                  allowOverrides,
                })
                  .then(result => {
                    if (result.data?.updateSchemaPolicyForOrganization.error || result.error) {
                      toast({
                        variant: 'destructive',
                        title: 'Error',
                        description:
                          result.data?.updateSchemaPolicyForOrganization.error?.message ||
                          result.error?.message,
                      });
                    } else {
                      toast({
                        variant: 'default',
                        title: 'Success',
                        description: 'Policy updated successfully',
                      });
                    }
                  })
                  .catch();
              }
            : null
        }
        currentState={currentOrganization.schemaPolicy}
      >
        {form => (
          <div className="flex items-center pl-1 pt-2">
            <Checkbox
              id="allowOverrides"
              checked={form.values.allowOverrides}
              value="allowOverrides"
              onCheckedChange={newValue => form.setFieldValue('allowOverrides', newValue)}
              disabled={!currentOrganization.viewerCanModifySchemaPolicy}
            />
            <label htmlFor="allowOverrides" className="ml-2 inline-block text-sm text-gray-300">
              Allow projects to override or disable rules
            </label>
          </div>
        )}
      </PolicySettings>
    </SubPageLayout>
  );
}

const OrganizationSettingsPageQuery = graphql(`
  query OrganizationSettingsPageQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      ...SettingsPageRenderer_OrganizationFragment
      ...OrganizationPolicySettings_OrganizationFragment
      viewerCanAccessSettings
      viewerCanManageAccessTokens
      viewerCanManagePersonalAccessTokens
    }
  }
`);

export const OrganizationSettingsPageEnum = z.enum([
  'general',
  'policy',
  'access-tokens',
  'personal-access-tokens',
]);
export type OrganizationSettingsSubPage = z.TypeOf<typeof OrganizationSettingsPageEnum>;

function SettingsPageContent(props: {
  organizationSlug: string;
  page?: OrganizationSettingsSubPage;
}) {
  const router = useRouter();
  const [query] = useQuery({
    query: OrganizationSettingsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
  });

  const currentOrganization = query.data?.organization;

  const subPages = useMemo(() => {
    const pages: Array<{
      key: OrganizationSettingsSubPage;
      title: string;
    }> = [];

    if (currentOrganization?.viewerCanAccessSettings) {
      pages.push({
        key: 'general',
        title: 'General',
      });
    }

    pages.push({
      key: 'policy',
      title: 'Policy',
    });

    if (currentOrganization?.viewerCanManageAccessTokens) {
      pages.push({
        key: 'access-tokens',
        title: 'Access Tokens',
      });
    }

    if (currentOrganization?.viewerCanManagePersonalAccessTokens) {
      pages.push({
        key: 'personal-access-tokens',
        title: 'Personal Access Tokens',
      });
    }

    return pages;
  }, [currentOrganization]);

  const resolvedPage = props.page ? subPages.find(page => page.key === props.page) : subPages.at(0);

  useRedirect({
    canAccess: resolvedPage !== undefined,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug',
        params: {
          organizationSlug: props.organizationSlug,
        },
      });
    },
    entity: currentOrganization,
  });

  if (query.error) {
    return <QueryError organizationSlug={props.organizationSlug} error={query.error} />;
  }

  if (!resolvedPage || !currentOrganization) {
    return null;
  }

  return (
    <OrganizationLayout
      page={Page.Settings}
      organizationSlug={props.organizationSlug}
      className="flex flex-col gap-y-10"
    >
      <PageLayout>
        <NavLayout>
          {subPages.map(subPage => {
            return (
              <Button
                key={subPage.key}
                data-cy={`target-settings-${subPage.key}-link`}
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
            );
          })}
        </NavLayout>
        <PageLayoutContent>
          <div className="space-y-12">
            {resolvedPage.key === 'general' ? (
              <OrganizationSettingsContent
                organizationSlug={props.organizationSlug}
                organization={currentOrganization}
              />
            ) : null}
            {resolvedPage.key === 'policy' ? (
              <OrganizationPolicySettings organization={currentOrganization} />
            ) : null}
            {resolvedPage.key === 'access-tokens' ? (
              <AccessTokensSubPage organizationSlug={props.organizationSlug} />
            ) : null}
            {resolvedPage.key === 'personal-access-tokens' ? (
              <PersonalAccessTokensSubPage organizationSlug={props.organizationSlug} />
            ) : null}
          </div>
        </PageLayoutContent>
      </PageLayout>
    </OrganizationLayout>
  );
}

export function OrganizationSettingsPage(props: {
  organizationSlug: string;
  page?: OrganizationSettingsSubPage;
}) {
  return (
    <>
      <Meta title="Organization settings" />
      <SettingsPageContent organizationSlug={props.organizationSlug} page={props.page} />
    </>
  );
}

export const DeleteOrganizationDocument = graphql(`
  mutation deleteOrganization($selector: OrganizationSelectorInput!) {
    deleteOrganization(selector: $selector) {
      selector {
        organizationSlug
      }
      organization {
        __typename
        id
      }
    }
  }
`);

export function DeleteOrganizationModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
}) {
  const { organizationSlug } = props;
  const [, mutate] = useMutation(DeleteOrganizationDocument);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    const { error } = await mutate({
      selector: {
        organizationSlug,
      },
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete organization',
        description: error.message,
      });
    } else {
      toast({
        title: 'Organization deleted',
        description: 'The organization has been successfully deleted.',
      });
      props.toggleModalOpen();
      void router.navigate({
        to: '/',
      });
    }
  };

  return (
    <DeleteOrganizationModalContent
      isOpen={props.isOpen}
      toggleModalOpen={props.toggleModalOpen}
      handleDelete={handleDelete}
    />
  );
}

export function DeleteOrganizationModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  handleDelete: () => void;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="w-4/5 max-w-[520px] md:w-3/5">
        <DialogHeader>
          <DialogTitle>Delete organization</DialogTitle>
          <DialogDescription>
            Every project created under this organization will be deleted as well.
          </DialogDescription>
          <DialogDescription>
            <span className="font-bold">This action is irreversible!</span>
          </DialogDescription>
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

const AuditLogsOrganizationSettingsPageMutation = graphql(`
  mutation AuditLogsOrganizationSettingsPageMutation($input: ExportOrganizationAuditLogInput!) {
    exportOrganizationAuditLog(input: $input) {
      ok {
        url
      }
      error {
        message
      }
    }
  }
`);

const AuditLogsSchema = z.object({
  startDate: z.string(),
  endDate: z.string(),
  userId: z.string().optional(),
});

function AuditLogsOrganizationModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
}) {
  const { organizationSlug: organization } = props;
  const { toast } = useToast();
  const [, exportAuditLogs] = useMutation(AuditLogsOrganizationSettingsPageMutation);

  const today = new Date().toISOString().split('T')[0];
  const lastYear = new Date(new Date().setFullYear(new Date().getFullYear() - 1))
    .toISOString()
    .split('T')[0];

  const form = useForm<z.infer<typeof AuditLogsSchema>>({
    mode: 'onSubmit',
    resolver: zodResolver(AuditLogsSchema),
    defaultValues: {
      startDate: lastYear,
      endDate: today,
    },
  });

  async function onSubmit(data: z.infer<typeof AuditLogsSchema>) {
    const formattedStartDate = new Date(data.startDate).toISOString();
    const formattedEndDate = new Date(data.endDate).toISOString();

    const result = await exportAuditLogs({
      input: {
        selector: {
          organizationSlug: organization,
        },
        filter: {
          startDate: formattedStartDate,
          endDate: formattedEndDate,
        },
      },
    });

    if (result.data?.exportOrganizationAuditLog.error) {
      toast({
        title: 'Failed to start audit logs report',
        description: result.data.exportOrganizationAuditLog.error.message,
        variant: 'destructive',
      });
      return;
    }

    props.toggleModalOpen();
    form.reset();
    toast({
      title: 'Audit logs report generated',
      description: 'The audit logs report has been generated and will be sent to your email.',
    });
  }

  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="w-4/5 max-w-[520px] md:w-3/5">
        <Form {...form}>
          <form className="space-y-8" onSubmit={form.handleSubmit(onSubmit)}>
            <DialogHeader>
              <DialogTitle>Audit Logs</DialogTitle>
              <DialogDescription>
                Select a date range to generate an audit logs report.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-row justify-evenly gap-x-8">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-2">
                <ArrowRightIcon className="text-neutral-10 size-6" />
              </div>
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button
                className="w-full"
                type="submit"
                disabled={!form.formState.isValid || form.formState.isSubmitting}
              >
                Generate Report
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
