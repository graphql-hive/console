import { ComponentProps, PropsWithoutRef, useCallback, useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { formatISO } from 'date-fns';
import { InfoIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { Page, TargetLayout } from '@/components/layouts/target';
import { SchemaEditor } from '@/components/schema-editor';
import { CDNAccessTokens } from '@/components/target/settings/cdn-access-tokens';
import { CreateAccessTokenModal } from '@/components/target/settings/registry-access-token';
import { SchemaContracts } from '@/components/target/settings/schema-contracts';
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
import { Spinner } from '@/components/ui/spinner';
import { Switch } from '@/components/ui/switch';
import { TimeAgo } from '@/components/ui/time-ago';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { Combobox } from '@/components/v2/combobox';
import { Table, TBody, Td, Tr } from '@/components/v2/table';
import { Tag } from '@/components/v2/tag';
import { ENTERPRISE_RETENTION_DAYS } from '@/constants';
import { env } from '@/env/frontend';
import { FragmentType, graphql, useFragment } from '@/gql';
import { ProjectType } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { canAccessTarget, TargetAccessScope } from '@/lib/access/target';
import { subDays } from '@/lib/date-time';
import { useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { resolveRetentionInDaysBasedOrganizationPlan } from '@/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useRouter } from '@tanstack/react-router';

const RegistryAccessTokens_MeFragment = graphql(`
  fragment RegistryAccessTokens_MeFragment on Member {
    ...CanAccessTarget_MemberFragment
  }
`);

export const DeleteTokensDocument = graphql(`
  mutation deleteTokens($input: DeleteTokensInput!) {
    deleteTokens(input: $input) {
      selector {
        organizationSlug
        projectSlug
        targetSlug
      }
      deletedTokens
    }
  }
`);

export const TokensDocument = graphql(`
  query tokens($selector: TargetSelectorInput!) {
    tokens(selector: $selector) {
      total
      nodes {
        id
        alias
        name
        lastUsedAt
        date
      }
    }
  }
`);

function RegistryAccessTokens(props: {
  me: FragmentType<typeof RegistryAccessTokens_MeFragment>;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const me = useFragment(RegistryAccessTokens_MeFragment, props.me);
  const [{ fetching: deleting }, mutate] = useMutation(DeleteTokensDocument);
  const [checked, setChecked] = useState<string[]>([]);
  const [isModalOpen, toggleModalOpen] = useToggle();

  const [tokensQuery] = useQuery({
    query: TokensDocument,
    variables: {
      selector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
    },
  });

  const tokens = tokensQuery.data?.tokens.nodes;

  const deleteTokens = useCallback(async () => {
    await mutate({
      input: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
        tokenIds: checked,
      },
    });
    setChecked([]);
  }, [checked, mutate, props.organizationSlug, props.projectSlug, props.targetSlug]);

  const canManage = canAccessTarget(TargetAccessScope.TokensWrite, me);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Registry Access Tokens"
        description={
          <>
            <CardDescription>
              Registry Access Tokens are used to access to Hive Registry and perform actions on your
              targets/projects. In most cases, this token is used from the Hive CLI.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/targets#registry-access-tokens"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more about Registry Access Tokens
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      {canManage && (
        <div className="my-3.5 flex justify-between" data-cy="target-settings-registry-token">
          <Button data-cy="new-button" onClick={toggleModalOpen}>
            Create new registry token
          </Button>
          {checked.length === 0 ? null : (
            <Button
              data-cy="delete-button"
              variant="destructive"
              disabled={deleting}
              onClick={deleteTokens}
            >
              Delete ({checked.length || null})
            </Button>
          )}
        </div>
      )}
      <Table>
        <TBody>
          {tokens?.map(token => (
            <Tr key={token.id}>
              <Td width="1">
                <Checkbox
                  onCheckedChange={isChecked =>
                    setChecked(
                      isChecked ? [...checked, token.id] : checked.filter(k => k !== token.id),
                    )
                  }
                  checked={checked.includes(token.id)}
                  disabled={!canManage}
                />
              </Td>
              <Td>{token.alias}</Td>
              <Td>{token.name}</Td>
              <Td align="right">
                {token.lastUsedAt ? (
                  <>
                    last used <TimeAgo date={token.lastUsedAt} />
                  </>
                ) : (
                  'not used yet'
                )}
              </Td>
              <Td align="right">
                created <TimeAgo date={token.date} />
              </Td>
            </Tr>
          ))}
        </TBody>
      </Table>
      {isModalOpen && (
        <CreateAccessTokenModal
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
          isOpen={isModalOpen}
          toggleModalOpen={toggleModalOpen}
        />
      )}
    </SubPageLayout>
  );
}

const Settings_UpdateBaseSchemaMutation = graphql(`
  mutation Settings_UpdateBaseSchema($input: UpdateBaseSchemaInput!) {
    updateBaseSchema(input: $input) {
      ok {
        updatedTarget {
          id
          baseSchema
        }
      }
      error {
        message
      }
    }
  }
`);

const ExtendBaseSchema = (props: {
  baseSchema: string;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) => {
  const [mutation, mutate] = useMutation(Settings_UpdateBaseSchemaMutation);
  const [baseSchema, setBaseSchema] = useState(props.baseSchema);
  const { toast } = useToast();

  const isUnsaved = baseSchema?.trim() !== props.baseSchema?.trim();

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Extend Your Schema"
        description={
          <>
            <CardDescription>
              Schema Extensions is pre-defined GraphQL schema that is automatically merged with your
              published schemas, before being checked and validated.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/targets#schema-extensions"
                className="text-gray-500 hover:text-gray-300"
              >
                You can find more details and examples in the documentation
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      <SchemaEditor
        theme="vs-dark"
        options={{ readOnly: mutation.fetching }}
        value={baseSchema}
        height={300}
        onChange={value => setBaseSchema(value ?? '')}
      />
      {mutation.data?.updateBaseSchema.error && (
        <div className="text-red-500">{mutation.data.updateBaseSchema.error.message}</div>
      )}
      {mutation.error && (
        <div className="text-red-500">
          {mutation.error?.graphQLErrors[0]?.message ?? mutation.error.message}
        </div>
      )}
      <div className="flex items-center gap-x-3">
        <Button
          className="px-5"
          disabled={mutation.fetching}
          onClick={async () => {
            await mutate({
              input: {
                organizationSlug: props.organizationSlug,
                projectSlug: props.projectSlug,
                targetSlug: props.targetSlug,
                newBase: baseSchema,
              },
            }).then(result => {
              if (result.error || result.data?.updateBaseSchema.error) {
                toast({
                  variant: 'destructive',
                  title: 'Error',
                  description:
                    result.error?.message || result.data?.updateBaseSchema.error?.message,
                });
              } else {
                toast({
                  variant: 'default',
                  title: 'Success',
                  description: 'Base schema updated successfully',
                });
              }
            });
          }}
        >
          Save
        </Button>
        <Button
          variant="secondary"
          className="px-5"
          onClick={() => setBaseSchema(props.baseSchema)}
        >
          Reset
        </Button>
        {isUnsaved && <span className="text-sm text-green-500">Unsaved changes!</span>}
      </div>
    </SubPageLayout>
  );
};

const ClientExclusion_AvailableClientNamesQuery = graphql(`
  query ClientExclusion_AvailableClientNamesQuery($selector: ClientStatsByTargetsInput!) {
    clientStatsByTargets(selector: $selector) {
      nodes {
        name
      }
      total
    }
  }
`);

function ClientExclusion(
  props: PropsWithoutRef<
    {
      organizationSlug: string;
      projectSlug: string;
      selectedTargetIds: string[];
      clientsFromSettings: string[];
      value: string[];
    } & Pick<ComponentProps<typeof Combobox>, 'name' | 'disabled' | 'onBlur' | 'onChange'>
  >,
) {
  const now = floorDate(new Date());
  const [availableClientNamesQuery] = useQuery({
    query: ClientExclusion_AvailableClientNamesQuery,
    variables: {
      selector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetIds: props.selectedTargetIds,
        period: {
          from: formatISO(subDays(now, 90)),
          to: formatISO(now),
        },
      },
    },
  });

  const clientNamesFromStats =
    availableClientNamesQuery.data?.clientStatsByTargets.nodes.map(n => n.name) ?? [];
  const allClientNames = clientNamesFromStats.concat(
    props.clientsFromSettings.filter(clientName => !clientNamesFromStats.includes(clientName)),
  );

  return (
    <Combobox
      name={props.name}
      placeholder="Select..."
      value={props.value.map(name => ({ label: name, value: name }))}
      options={
        allClientNames.map(name => ({
          value: name,
          label: name,
        })) ?? []
      }
      onBlur={props.onBlur}
      onChange={props.onChange}
      disabled={props.disabled}
      loading={availableClientNamesQuery.fetching}
    />
  );
}

const TargetSettings_TargetValidationSettingsFragment = graphql(`
  fragment TargetSettings_TargetValidationSettingsFragment on TargetValidationSettings {
    enabled
    period
    percentage
    targets {
      id
      slug
    }
    excludedClients
  }
`);

const TargetSettingsPage_TargetSettingsQuery = graphql(`
  query TargetSettingsPage_TargetSettingsQuery(
    $selector: TargetSelectorInput!
    $targetsSelector: ProjectSelectorInput!
    $organizationSelector: OrganizationSelectorInput!
  ) {
    target(selector: $selector) {
      id
      validationSettings {
        ...TargetSettings_TargetValidationSettingsFragment
      }
    }
    targets(selector: $targetsSelector) {
      nodes {
        id
        slug
      }
    }
    organization(selector: $organizationSelector) {
      organization {
        id
        plan
        rateLimit {
          retentionInDays
        }
      }
    }
  }
`);

const SetTargetValidationMutation = graphql(`
  mutation Settings_SetTargetValidation($input: SetTargetValidationInput!) {
    setTargetValidation(input: $input) {
      id
      validationSettings {
        ...TargetSettings_TargetValidationSettingsFragment
      }
    }
  }
`);

const TargetSettingsPage_UpdateTargetValidationSettingsMutation = graphql(`
  mutation TargetSettingsPage_UpdateTargetValidationSettings(
    $input: UpdateTargetValidationSettingsInput!
  ) {
    updateTargetValidationSettings(input: $input) {
      ok {
        target {
          id
          validationSettings {
            ...TargetSettings_TargetValidationSettingsFragment
          }
        }
      }
      error {
        message
        inputErrors {
          percentage
          period
        }
      }
    }
  }
`);

function floorDate(date: Date): Date {
  const time = 1000 * 60;
  return new Date(Math.floor(date.getTime() / time) * time);
}

const conditionalBreakingChangesFormSchema = z.object({
  period: z.preprocess(
    value => Number(value),
    z
      .number({ required_error: 'Period is required' })
      .min(1, 'Period must be at least 1 days')
      .max(ENTERPRISE_RETENTION_DAYS, `Period must be at most ${ENTERPRISE_RETENTION_DAYS} days`)
      .transform(value => Math.round(value)),
  ),
  percentage: z.preprocess(
    value => Number(value),
    z
      .number({ required_error: 'Percentage is required' })
      .min(0, 'Percentage must be at least 0%')
      .max(100, 'Percentage must be at most 100%')
      .transform(value => Math.round(value)),
  ),
  targetIds: z.array(z.string()),
  excludedClients: z.array(z.string()),
});

type ConditionalBreakingChangesFormValues = z.infer<typeof conditionalBreakingChangesFormSchema>;

const ConditionalBreakingChanges = (props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) => {
  const { toast } = useToast();
  const [targetValidation, setValidation] = useMutation(SetTargetValidationMutation);
  const [_, updateValidation] = useMutation(
    TargetSettingsPage_UpdateTargetValidationSettingsMutation,
  );
  const [targetSettings] = useQuery({
    query: TargetSettingsPage_TargetSettingsQuery,
    variables: {
      selector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
      },
      targetsSelector: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
      },
      organizationSelector: {
        organizationSlug: props.organizationSlug,
      },
    },
  });

  const settings = useFragment(
    TargetSettings_TargetValidationSettingsFragment,
    targetSettings.data?.target?.validationSettings,
  );

  const retentionInDaysBasedOrganizationPlan =
    targetSettings.data?.organization?.organization?.rateLimit.retentionInDays;
  const defaultDays = resolveRetentionInDaysBasedOrganizationPlan(
    retentionInDaysBasedOrganizationPlan,
  );

  const isEnabled = settings?.enabled || false;
  const possibleTargets = targetSettings.data?.targets.nodes;

  const conditionalBreakingChangesForm = useForm({
    mode: 'all',
    resolver: zodResolver(conditionalBreakingChangesFormSchema),
    defaultValues: {
      period: settings?.period ?? defaultDays,
      percentage: settings?.percentage ?? 0,
      targetIds: settings?.targets.map(t => t.id) || [],
      excludedClients: settings?.excludedClients ?? [],
    },
  });

  // Set form values when settings are fetched
  useEffect(() => {
    conditionalBreakingChangesForm.setValue('period', settings?.period ?? defaultDays);
    conditionalBreakingChangesForm.setValue('percentage', settings?.percentage ?? 0);
    conditionalBreakingChangesForm.setValue('targetIds', settings?.targets.map(t => t.id) || []);
    conditionalBreakingChangesForm.setValue('excludedClients', settings?.excludedClients ?? []);
  }, [settings]);

  const orgPlan = targetSettings.data?.organization?.organization?.plan;

  async function onConditionalBreakingChangesFormSubmit(
    data: ConditionalBreakingChangesFormValues,
  ) {
    // This is a workaround for the issue with zod's transform function
    if (data.period > defaultDays) {
      conditionalBreakingChangesForm.setError('period', {
        message: `Period must be at most ${defaultDays} days`,
        type: 'maxLength',
      });
      return;
    }
    try {
      const result = await updateValidation({
        input: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
          percentage: data.percentage,
          period: data.period,
          targetIds: data.targetIds,
          excludedClients: data.excludedClients,
        },
      });
      if (result.data?.updateTargetValidationSettings.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.data.updateTargetValidationSettings.error.message,
        });
      } else {
        toast({
          variant: 'default',
          title: 'Success',
          description: 'Conditional breaking changes updated successfully',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update conditional breaking changes',
      });
    }
  }

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Conditional Breaking Changes"
        description={
          <>
            <CardDescription>
              Conditional Breaking Changes can change the behavior of schema checks, based on real
              traffic data sent to Hive.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/targets#conditional-breaking-changes"
                className="text-gray-500 hover:text-gray-300"
              >
                Learn more
              </DocsLink>
            </CardDescription>
          </>
        }
      >
        {targetSettings.fetching ? (
          <Spinner />
        ) : (
          <Switch
            className="shrink-0 data-[state=unchecked]:bg-gray-700"
            checked={isEnabled}
            onCheckedChange={async enabled => {
              await setValidation({
                input: {
                  targetSlug: props.targetSlug,
                  projectSlug: props.projectSlug,
                  organizationSlug: props.organizationSlug,
                  enabled,
                },
              });
            }}
            disabled={targetValidation.fetching}
          />
        )}
      </SubPageLayoutHeader>
      <Form {...conditionalBreakingChangesForm}>
        <form
          onSubmit={conditionalBreakingChangesForm.handleSubmit(
            onConditionalBreakingChangesFormSubmit,
          )}
        >
          <div className={clsx('text-gray-300', !isEnabled && 'pointer-events-none opacity-25')}>
            <div className="flex flex-row items-baseline justify-start">
              A schema change is considered as breaking only if it affects more than
              <FormField
                control={conditionalBreakingChangesForm.control}
                name="percentage"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        autoComplete="off"
                        placeholder="Percentage"
                        className="mx-2 !inline-flex w-16"
                        disabled={!isEnabled}
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              % of traffic in the past
              <div className="ml-2 flex flex-row items-baseline">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <InfoIcon className="h-4 w-4 text-gray-400" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        You can customize Conditional Breaking Change date range,
                        <br />
                        based on your data retention and your Hive plan.
                        <br />
                        Your plan: {orgPlan}.
                        <br />
                        Date retention: {defaultDays} days.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <FormField
                control={conditionalBreakingChangesForm.control}
                name="period"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type="number"
                        autoComplete="off"
                        {...field}
                        className="mx-2 !inline-flex w-16"
                        disabled={!isEnabled}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              days.
            </div>
            {conditionalBreakingChangesForm.formState.errors.period && (
              <FormField
                control={conditionalBreakingChangesForm.control}
                name="period"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {conditionalBreakingChangesForm.formState.errors.percentage && (
              <FormField
                control={conditionalBreakingChangesForm.control}
                name="percentage"
                render={() => (
                  <FormItem>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="space-y-6">
              <div className="space-y-2">
                <div>
                  <div className="font-semibold">Schema usage data from these targets:</div>
                  <div className="text-xs text-gray-400">
                    Marks a breaking change as safe when it was not requested in the targets
                    clients.
                  </div>
                </div>
                <div className="pl-2">
                  {possibleTargets?.map(pt => (
                    <div key={pt.id} className="flex items-center gap-x-2">
                      <FormField
                        control={conditionalBreakingChangesForm.control}
                        name="targetIds"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Checkbox
                                checked={field.value.includes(pt.id)}
                                onCheckedChange={async isChecked => {
                                  await conditionalBreakingChangesForm.setValue(
                                    'targetIds',
                                    isChecked
                                      ? [...field.value, pt.id]
                                      : field.value.filter(value => value !== pt.id),
                                  );
                                }}
                                onBlur={() =>
                                  conditionalBreakingChangesForm.setValue('targetIds', field.value)
                                }
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      {pt.slug}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold">Allow breaking change for these clients:</div>
                    <div className="text-xs text-gray-400">
                      Marks a breaking change as safe when it only affects the following clients.
                    </div>
                  </div>
                  <div className="max-w-[420px]">
                    {conditionalBreakingChangesForm.watch('targetIds').length > 0 ? (
                      <FormField
                        control={conditionalBreakingChangesForm.control}
                        name="excludedClients"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <ClientExclusion
                                organizationSlug={props.organizationSlug}
                                projectSlug={props.projectSlug}
                                selectedTargetIds={field.value}
                                clientsFromSettings={settings?.excludedClients ?? []}
                                name="excludedClients"
                                value={field.value}
                                onBlur={() =>
                                  conditionalBreakingChangesForm.setValue(
                                    'excludedClients',
                                    field.value,
                                  )
                                }
                                onChange={async options => {
                                  await conditionalBreakingChangesForm.setValue(
                                    'excludedClients',
                                    options.map(o => o.value),
                                  );
                                }}
                                disabled={conditionalBreakingChangesForm.formState.isSubmitting}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    ) : (
                      <div className="mb-3 mt-5 space-y-2 rounded border-l-2 border-l-yellow-800 bg-yellow-600/10 py-2 pl-5 text-gray-400">
                        <div>
                          <div className="font-semibold">Select a target to enable this option</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <FormField
                    control={conditionalBreakingChangesForm.control}
                    name="excludedClients"
                    render={() => <FormMessage />}
                  />
                </div>
              </div>
            </div>
            <div className="mb-3 mt-5 space-y-2 rounded border-l-2 border-l-gray-800 bg-gray-600/10 py-2 pl-5 text-gray-400">
              <div>
                <div className="font-semibold">Example settings</div>
                <div className="text-sm">Removal of a field is considered breaking if</div>
              </div>
              <div className="text-sm">
                <Tag color="yellow" className="py-0">
                  0%
                </Tag>{' '}
                - the field was used at least once in past 30 days
              </div>
              <div className="text-sm">
                <Tag color="yellow" className="py-0">
                  10%
                </Tag>{' '}
                - the field was requested by more than 10% of all GraphQL operations in recent 30
                days
              </div>
            </div>
            <Button
              type="submit"
              disabled={conditionalBreakingChangesForm.formState.isSubmitting || !isEnabled}
            >
              Save
            </Button>
          </div>
        </form>
      </Form>
    </SubPageLayout>
  );
};

const SlugFormSchema = z.object({
  slug: z
    .string({
      required_error: 'Target slug is required',
    })
    .min(1, 'Target slug is required')
    .max(50, 'Slug must be less than 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers and dashes'),
});
type SlugFormValues = z.infer<typeof SlugFormSchema>;

function TargetSlug(props: { organizationSlug: string; projectSlug: string; targetSlug: string }) {
  const router = useRouter();
  const { toast } = useToast();

  const [_slugMutation, slugMutate] = useMutation(TargetSettingsPage_UpdateTargetSlugMutation);
  const slugForm = useForm({
    mode: 'all',
    resolver: zodResolver(SlugFormSchema),
    defaultValues: {
      slug: props.targetSlug,
    },
  });

  const onSlugFormSubmit = useCallback(
    async (data: SlugFormValues) => {
      try {
        const result = await slugMutate({
          input: {
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
            slug: data.slug,
          },
        });

        const error = result.error || result.data?.updateTargetSlug.error;

        if (result.data?.updateTargetSlug?.ok) {
          toast({
            variant: 'default',
            title: 'Success',
            description: 'Target slug updated',
          });
          void router.navigate({
            to: '/$organizationSlug/$projectSlug/$targetSlug/settings',
            params: {
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: result.data.updateTargetSlug.ok.target.slug,
            },
            search: {
              page: 'general',
            },
          });
        } else if (error) {
          slugForm.setError('slug', error);
        }
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to update target slug',
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
            subPageTitle="Target Slug"
            description={
              <CardDescription>
                This is your target's URL namespace on Hive. Changing it{' '}
                <span className="font-bold">will</span> invalidate any existing links to your
                target.
                <br />
                <DocsLink
                  className="text-muted-foreground text-sm"
                  href="/management/targets#change-slug-of-a-target"
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
                    <div className="flex items-center">
                      <div className="border-input text-muted-foreground h-10 rounded-md rounded-r-none border-y border-l bg-gray-900 px-3 py-2 text-sm">
                        {env.appBaseUrl.replace(/https?:\/\//i, '')}/{props.organizationSlug}/
                        {props.projectSlug}/
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
          </div>
        </SubPageLayout>
      </form>
    </Form>
  );
}

const TargetSettingsPage_UpdateTargetGraphQLEndpointUrl = graphql(`
  mutation TargetSettingsPage_UpdateTargetGraphQLEndpointUrl(
    $input: UpdateTargetGraphQLEndpointUrlInput!
  ) {
    updateTargetGraphQLEndpointUrl(input: $input) {
      ok {
        target {
          id
          graphqlEndpointUrl
        }
      }
      error {
        message
      }
    }
  }
`);

const GraphQLEndpointUrlFormSchema = z.object({
  enableReinitialize: z.boolean(),
  graphqlEndpointUrl: z
    .string()
    .url('Please enter a valid url')
    .max(300, 'Max 300 chars.')
    .min(1, 'Please enter a valid url.'),
});

type GraphQLEndpointUrlFormValues = z.infer<typeof GraphQLEndpointUrlFormSchema>;

function GraphQLEndpointUrl(props: {
  graphqlEndpointUrl: string | null;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { toast } = useToast();
  const [_, mutate] = useMutation(TargetSettingsPage_UpdateTargetGraphQLEndpointUrl);

  const graphQLEndpointUrlForm = useForm({
    mode: 'onChange',
    resolver: zodResolver(GraphQLEndpointUrlFormSchema),
    defaultValues: {
      enableReinitialize: true,
      graphqlEndpointUrl: props.graphqlEndpointUrl || '',
    },
  });

  function onGraphQLEndpointUrlFormSubmit(data: GraphQLEndpointUrlFormValues) {
    mutate({
      input: {
        organizationSlug: props.organizationSlug,
        projectSlug: props.projectSlug,
        targetSlug: props.targetSlug,
        graphqlEndpointUrl: data.graphqlEndpointUrl === '' ? null : data.graphqlEndpointUrl,
      },
    }).then(result => {
      if (result.error || result.data?.updateTargetGraphQLEndpointUrl.error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description:
            result.error?.message || result.data?.updateTargetGraphQLEndpointUrl.error?.message,
        });
      } else {
        toast({
          variant: 'default',
          title: 'Success',
          description: 'GraphQL endpoint url updated successfully',
        });
      }
    });
  }

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="GraphQL Endpoint URL"
        description={
          <>
            <CardDescription>
              The endpoint url will be used for querying the target from the{' '}
              <Link
                to="/$organizationSlug/$projectSlug/$targetSlug/laboratory"
                params={{
                  organizationSlug: props.organizationSlug,
                  projectSlug: props.projectSlug,
                  targetSlug: props.targetSlug,
                }}
              >
                Hive Laboratory
              </Link>
              .
            </CardDescription>
          </>
        }
      />
      <Form {...graphQLEndpointUrlForm}>
        <form onSubmit={graphQLEndpointUrlForm.handleSubmit(onGraphQLEndpointUrlFormSubmit)}>
          <FormField
            control={graphQLEndpointUrlForm.control}
            name="graphqlEndpointUrl"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    autoComplete="off"
                    placeholder="Endpoint Url"
                    className="w-96"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            disabled={
              graphQLEndpointUrlForm.formState.isSubmitting ||
              !graphQLEndpointUrlForm.formState.isValid
            }
          >
            Save
          </Button>
        </form>
      </Form>
    </SubPageLayout>
  );
}

const TargetSettingsPage_UpdateTargetSlugMutation = graphql(`
  mutation TargetSettingsPage_UpdateTargetSlugMutation($input: UpdateTargetSlugInput!) {
    updateTargetSlug(input: $input) {
      ok {
        selector {
          organizationSlug
          projectSlug
          targetSlug
        }
        target {
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

const TargetSettingsPage_OrganizationFragment = graphql(`
  fragment TargetSettingsPage_OrganizationFragment on Organization {
    me {
      ...CanAccessTarget_MemberFragment
      ...RegistryAccessTokens_MeFragment
    }
  }
`);

function TargetDelete(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const [isModalOpen, toggleModalOpen] = useToggle();

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Delete Target"
        description={
          <>
            <CardDescription>
              Deleting an project also delete all schemas and data associated with it.
            </CardDescription>
            <CardDescription>
              <DocsLink
                href="/management/targets#delete-a-target"
                className="text-gray-500 hover:text-gray-300"
              >
                <strong>This action is not reversible!</strong> You can find more information about
                this process in the documentation
              </DocsLink>
            </CardDescription>
          </>
        }
      />
      <Button variant="destructive" onClick={toggleModalOpen}>
        Delete Target
      </Button>

      <DeleteTargetModal
        organizationSlug={props.organizationSlug}
        projectSlug={props.projectSlug}
        targetSlug={props.targetSlug}
        isOpen={isModalOpen}
        toggleModalOpen={toggleModalOpen}
      />
    </SubPageLayout>
  );
}

const TargetSettingsPageQuery = graphql(`
  query TargetSettingsPageQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    organization(selector: { organizationSlug: $organizationSlug }) {
      organization {
        id
        slug
        ...TargetSettingsPage_OrganizationFragment
      }
    }
    project(selector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug }) {
      id
      slug
      type
    }
    target(
      selector: {
        organizationSlug: $organizationSlug
        projectSlug: $projectSlug
        targetSlug: $targetSlug
      }
    ) {
      id
      slug
      graphqlEndpointUrl
      viewerCanAccessSettings
      baseSchema
      viewerCanModifySettings
      viewerCanModifyCDNAccessToken
      viewerCanModifyTargetAccessToken
      viewerCanDelete
    }
  }
`);

function TargetSettingsContent(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  page?: TargetSettingsSubPage;
}) {
  const router = useRouter();
  const [query] = useQuery({
    query: TargetSettingsPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
      projectSlug: props.projectSlug,
      targetSlug: props.targetSlug,
    },
  });

  const currentOrganization = query.data?.organization?.organization;
  const currentProject = query.data?.project;
  const currentTarget = query.data?.target;
  const organizationForSettings = useFragment(
    TargetSettingsPage_OrganizationFragment,
    currentOrganization,
  );

  useRedirect({
    canAccess: currentTarget?.viewerCanAccessSettings === true,
    entity: currentTarget,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      });
    },
  });

  const subPages = useMemo(() => {
    const pages: Array<{
      key: TargetSettingsSubPage;
      title: string;
    }> = [];

    if (currentTarget?.viewerCanModifySettings) {
      pages.push(
        {
          key: 'general',
          title: 'General',
        },
        {
          key: 'base-schema',
          title: 'Base Schema',
        },
        {
          key: 'breaking-changes',
          title: 'Breaking Changes',
        },
      );
      if (currentProject?.type === ProjectType.Federation) {
        pages.push({
          key: 'schema-contracts',
          title: 'Schema Contracts',
        });
      }
    }

    if (currentTarget?.viewerCanModifyTargetAccessToken) {
      pages.push({
        key: 'registry-token',
        title: 'Registry Tokens',
      });
    }

    if (currentTarget?.viewerCanModifyCDNAccessToken) {
      pages.push({
        key: 'cdn',
        title: 'CDN Tokens',
      });
    }

    return pages;
  }, [currentTarget]);

  const resolvedPage = props.page ? subPages.find(page => page.key === props.page) : subPages.at(0);

  useRedirect({
    canAccess: resolvedPage !== undefined,
    entity: currentTarget,
    redirectTo: router => {
      void router.navigate({
        to: '/$organizationSlug/$projectSlug/$targetSlug',
        params: {
          organizationSlug: props.organizationSlug,
          projectSlug: props.projectSlug,
          targetSlug: props.targetSlug,
        },
      });
    },
  });

  if (query.error) {
    return (
      <QueryError
        organizationSlug={props.organizationSlug}
        error={query.error}
        showLogoutButton={false}
      />
    );
  }

  if (
    !resolvedPage ||
    !currentOrganization ||
    !currentProject ||
    !currentTarget ||
    !organizationForSettings
  ) {
    return null;
  }

  return (
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
        {currentOrganization && currentProject && currentTarget && organizationForSettings ? (
          <div className="space-y-12">
            {resolvedPage.key === 'general' ? (
              <>
                <TargetSlug
                  targetSlug={props.targetSlug}
                  projectSlug={props.projectSlug}
                  organizationSlug={props.organizationSlug}
                />
                <GraphQLEndpointUrl
                  targetSlug={currentTarget.slug}
                  projectSlug={currentProject.slug}
                  organizationSlug={currentOrganization.slug}
                  graphqlEndpointUrl={currentTarget.graphqlEndpointUrl ?? null}
                />
                {currentTarget?.viewerCanDelete && (
                  <TargetDelete
                    targetSlug={currentTarget.slug}
                    projectSlug={currentProject.slug}
                    organizationSlug={currentOrganization.slug}
                  />
                )}
              </>
            ) : null}
            {resolvedPage.key === 'cdn' ? (
              <CDNAccessTokens
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
              />
            ) : null}
            {resolvedPage.key === 'registry-token' ? (
              <RegistryAccessTokens
                me={organizationForSettings.me}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
              />
            ) : null}
            {resolvedPage.key === 'breaking-changes' ? (
              <ConditionalBreakingChanges
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
              />
            ) : null}
            {resolvedPage.key === 'base-schema' ? (
              <ExtendBaseSchema
                baseSchema={currentTarget?.baseSchema ?? ''}
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
              />
            ) : null}
            {resolvedPage.key === 'schema-contracts' ? (
              <SchemaContracts
                organizationSlug={props.organizationSlug}
                projectSlug={props.projectSlug}
                targetSlug={props.targetSlug}
              />
            ) : null}
          </div>
        ) : null}
      </PageLayoutContent>
    </PageLayout>
  );
}

export const TargetSettingsPageEnum = z.enum([
  'general',
  'cdn',
  'registry-token',
  'breaking-changes',
  'base-schema',
  'schema-contracts',
]);

export type TargetSettingsSubPage = z.TypeOf<typeof TargetSettingsPageEnum>;

export function TargetSettingsPage(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  page?: TargetSettingsSubPage;
}) {
  return (
    <>
      <Meta title="Settings" />
      <TargetLayout
        targetSlug={props.targetSlug}
        projectSlug={props.projectSlug}
        organizationSlug={props.organizationSlug}
        page={Page.Settings}
      >
        <TargetSettingsContent
          organizationSlug={props.organizationSlug}
          projectSlug={props.projectSlug}
          targetSlug={props.targetSlug}
          page={props.page}
        />
      </TargetLayout>
    </>
  );
}

export const DeleteTargetMutation = graphql(`
  mutation deleteTarget($selector: TargetSelectorInput!) {
    deleteTarget(selector: $selector) {
      deletedTarget {
        __typename
        id
      }
    }
  }
`);

export function DeleteTargetModal(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { organizationSlug, projectSlug, targetSlug } = props;
  const [, mutate] = useMutation(DeleteTargetMutation);
  const { toast } = useToast();
  const router = useRouter();

  const handleDelete = async () => {
    const { error } = await mutate({
      selector: {
        organizationSlug,
        projectSlug,
        targetSlug,
      },
    });
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Failed to delete target',
        description: error.message,
      });
    } else {
      toast({
        title: 'Target deleted',
        description: 'The target has been successfully deleted.',
      });
      props.toggleModalOpen();
      void router.navigate({
        to: '/$organizationSlug/$projectSlug',
        params: {
          organizationSlug,
          projectSlug,
        },
      });
    }
  };

  return (
    <DeleteTargetModalContent
      isOpen={props.isOpen}
      toggleModalOpen={props.toggleModalOpen}
      handleDelete={handleDelete}
    />
  );
}

export function DeleteTargetModalContent(props: {
  isOpen: boolean;
  toggleModalOpen: () => void;
  handleDelete: () => void;
}) {
  return (
    <Dialog open={props.isOpen} onOpenChange={props.toggleModalOpen}>
      <DialogContent className="w-4/5 max-w-[520px] md:w-3/5">
        <DialogHeader>
          <DialogTitle>Delete target</DialogTitle>
          <DialogDescription>
            Every published schema, reported data, and settings associated with this target will be
            permanently deleted.
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
