import { ComponentProps, PropsWithoutRef, useCallback, useMemo, useState } from 'react';
import clsx from 'clsx';
import { formatISO } from 'date-fns';
import { useFormik } from 'formik';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import * as Yup from 'yup';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ResourceDetails } from '@/components/ui/resource-details';
import { Spinner } from '@/components/ui/spinner';
import { TimeAgo } from '@/components/ui/time-ago';
import { useToast } from '@/components/ui/use-toast';
import { Combobox } from '@/components/v2/combobox';
import { Switch } from '@/components/v2/switch';
import { Table, TBody, Td, Tr } from '@/components/v2/table';
import { Tag } from '@/components/v2/tag';
import { env } from '@/env/frontend';
import { graphql, useFragment } from '@/gql';
import { BreakingChangeFormulaType, ProjectType } from '@/gql/graphql';
import { useRedirect } from '@/lib/access/common';
import { subDays } from '@/lib/date-time';
import { useToggle } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { RadioGroupIndicator } from '@radix-ui/react-radio-group';
import { Link, useRouter } from '@tanstack/react-router';

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
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
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

const TargetSettings_ConditionalBreakingChangeConfigurationFragment = graphql(`
  fragment TargetSettings_ConditionalBreakingChangeConfigurationFragment on ConditionalBreakingChangeConfiguration {
    isEnabled
    period
    percentage
    requestCount
    breakingChangeFormula
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
    target(reference: { bySelector: $selector }) {
      id
      failDiffOnDangerousChange
      conditionalBreakingChangeConfiguration {
        ...TargetSettings_ConditionalBreakingChangeConfigurationFragment
      }
    }
    targets(selector: $targetsSelector) {
      nodes {
        id
        slug
      }
    }
    organization(reference: { bySelector: $organizationSelector }) {
      id
      rateLimit {
        retentionInDays
      }
    }
  }
`);

const TargetSettingsPage_UpdateTargetConditionalBreakingChangeConfigurationMutation = graphql(`
  mutation TargetSettingsPage_UpdateTargetConditionalBreakingChangeConfigurationMutation(
    $input: UpdateTargetConditionalBreakingChangeConfigurationInput!
  ) {
    updateTargetConditionalBreakingChangeConfiguration(input: $input) {
      ok {
        target {
          id
          failDiffOnDangerousChange
          conditionalBreakingChangeConfiguration {
            ...TargetSettings_ConditionalBreakingChangeConfigurationFragment
          }
        }
      }
      error {
        message
        inputErrors {
          percentage
          period
          requestCount
        }
      }
    }
  }
`);

const TargetSettingsPage_UpdateTargetDangerousChangeClassificationMutation = graphql(`
  mutation TargetSettingsPage_UpdateTargetDangerousChangeClassificationMutation(
    $input: UpdateTargetDangerousChangeClassificationInput!
  ) {
    updateTargetDangerousChangeClassification(input: $input) {
      ok {
        target {
          id
          failDiffOnDangerousChange
        }
      }
      error {
        message
      }
    }
  }
`);

function floorDate(date: Date): Date {
  const time = 1000 * 60;
  return new Date(Math.floor(date.getTime() / time) * time);
}

const BreakingChanges = (props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) => {
  const [mutation, updateValidation] = useMutation(
    TargetSettingsPage_UpdateTargetConditionalBreakingChangeConfigurationMutation,
  );
  const [dangerousAsBreaking, updateTargetDangerousChangeClassification] = useMutation(
    TargetSettingsPage_UpdateTargetDangerousChangeClassificationMutation,
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

  const configuration = useFragment(
    TargetSettings_ConditionalBreakingChangeConfigurationFragment,
    targetSettings.data?.target?.conditionalBreakingChangeConfiguration,
  );

  const considerDangerousAsBreaking =
    targetSettings?.data?.target?.failDiffOnDangerousChange || false;
  const isEnabled = configuration?.isEnabled || false;
  const possibleTargets = targetSettings.data?.targets.nodes;
  const { toast } = useToast();

  const {
    handleSubmit,
    isSubmitting,
    errors,
    touched,
    values,
    handleBlur,
    handleChange,
    setFieldValue,
    setFieldTouched,
  } = useFormik({
    enableReinitialize: true,
    initialValues: {
      percentage: configuration?.percentage || 0,
      requestCount: configuration?.requestCount || 1,
      period: configuration?.period || 0,
      breakingChangeFormula:
        configuration?.breakingChangeFormula ?? BreakingChangeFormulaType.Percentage,
      targetIds: configuration?.targets.map(t => t.id) || [],
      excludedClients: configuration?.excludedClients ?? [],
    },
    validationSchema: Yup.object().shape({
      percentage: Yup.number().when('breakingChangeFormula', {
        is: 'PERCENTAGE',
        then: schema => schema.min(0).max(100).required(),
        otherwise: schema => schema.nullable(),
      }),
      requestCount: Yup.number().when('breakingChangeFormula', {
        is: 'REQUEST_COUNT',
        then: schema => schema.min(1).required(),
        otherwise: schema => schema.nullable(),
      }),
      period: Yup.number()
        .min(1)
        .max(targetSettings.data?.organization?.rateLimit.retentionInDays ?? 30)
        .test('double-precision', 'Invalid precision', num => {
          if (typeof num !== 'number') {
            return false;
          }

          // Round the number to two decimal places
          // and check if it is equal to the original number
          return Number(num.toFixed(2)) === num;
        })
        .required(),
      breakingChangeFormula: Yup.string().oneOf<BreakingChangeFormulaType>([
        BreakingChangeFormulaType.Percentage,
        BreakingChangeFormulaType.RequestCount,
      ]),
      targetIds: Yup.array().of(Yup.string()).min(1),
      excludedClients: Yup.array().of(Yup.string()),
    }),
    onSubmit: values =>
      updateValidation({
        input: {
          target: {
            bySelector: {
              organizationSlug: props.organizationSlug,
              projectSlug: props.projectSlug,
              targetSlug: props.targetSlug,
            },
          },
          conditionalBreakingChangeConfiguration: {
            ...values,
            /**
             * In case the input gets messed up, fallback to default values in cases
             * where it won't matter based on the selected formula.
             */
            requestCount:
              values.breakingChangeFormula === BreakingChangeFormulaType.Percentage &&
              (typeof values.requestCount !== 'number' || values.requestCount < 1)
                ? 1
                : values.requestCount,
            percentage:
              values.breakingChangeFormula === BreakingChangeFormulaType.RequestCount &&
              (typeof values.percentage !== 'number' || values.percentage < 0)
                ? 0
                : values.percentage,
          },
        },
      }).then(result => {
        if (result.error || result.data?.updateTargetConditionalBreakingChangeConfiguration.error) {
          toast({
            variant: 'destructive',
            title: 'Error',
            description:
              result.error?.message ||
              result.data?.updateTargetConditionalBreakingChangeConfiguration.error?.message,
          });
        } else {
          toast({
            variant: 'default',
            title: 'Success',
            description: 'Conditional breaking changes settings updated successfully',
          });
        }
      }),
  });

  return (
    <>
      <SubPageLayout>
        <SubPageLayoutHeader
          subPageTitle="Fail Checks for Dangerous Changes"
          description={
            <>
              <CardDescription className="max-w-[700px]">
                Dangerous changes are not technically breaking the protocol, but could cause issues
                for consumers of the schema. Failing schema checks for dangerous changes helps
                safeguard against these situations by requiring approval for dangerous changes.
                <br />
                <br />
                Before enabling this feature, be sure "contextId" is used on schema checks.
              </CardDescription>
              <CardDescription>
                <DocsLink
                  href="/management/targets#dangerous-changes"
                  className="text-gray-500 hover:text-gray-300"
                >
                  Learn more
                </DocsLink>
                <br />
                <br />
              </CardDescription>
            </>
          }
        >
          {targetSettings.fetching ? (
            <Spinner />
          ) : (
            <Switch
              className="shrink-0"
              checked={considerDangerousAsBreaking}
              onCheckedChange={async failDiffOnDangerousChange => {
                await updateTargetDangerousChangeClassification({
                  input: {
                    failDiffOnDangerousChange,
                    target: {
                      bySelector: {
                        targetSlug: props.targetSlug,
                        projectSlug: props.projectSlug,
                        organizationSlug: props.organizationSlug,
                      },
                    },
                  },
                });
              }}
              disabled={dangerousAsBreaking.fetching}
            />
          )}
        </SubPageLayoutHeader>
        {dangerousAsBreaking.error && (
          <span className="ml-2 text-red-500">
            {dangerousAsBreaking.error?.graphQLErrors[0]?.message ??
              dangerousAsBreaking.error.message}
          </span>
        )}
      </SubPageLayout>
      <form onSubmit={handleSubmit}>
        <SubPageLayout>
          <SubPageLayoutHeader
            subPageTitle="Conditional Breaking Changes"
            description={
              <>
                <CardDescription>
                  Conditional Breaking Changes can change the behavior of schema checks, based on
                  real traffic data sent to Hive.
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
                className="shrink-0"
                checked={isEnabled}
                onCheckedChange={async isEnabled => {
                  await updateValidation({
                    input: {
                      target: {
                        bySelector: {
                          organizationSlug: props.organizationSlug,
                          targetSlug: props.targetSlug,
                          projectSlug: props.projectSlug,
                        },
                      },
                      conditionalBreakingChangeConfiguration: {
                        isEnabled,
                      },
                    },
                  });
                }}
                disabled={mutation.fetching}
              />
            )}
          </SubPageLayoutHeader>
          <div className={clsx('text-gray-300', !isEnabled && 'pointer-events-none opacity-25')}>
            <div>A schema change is considered as breaking only if it affects more than</div>
            <div className="mx-4 my-2">
              <RadioGroup
                name="breakingChangeFormula"
                value={values.breakingChangeFormula}
                onValueChange={async value => {
                  await setFieldValue('breakingChangeFormula', value);
                }}
              >
                <div>
                  <RadioGroupItem
                    id="percentage"
                    key="percentage"
                    value="PERCENTAGE"
                    disabled={isSubmitting}
                    data-cy="target-cbc-breakingChangeFormula-option-percentage"
                  >
                    <RadioGroupIndicator />
                  </RadioGroupItem>
                  <Input
                    name="percentage"
                    onChange={async event => {
                      const value = Number(event.target.value);
                      if (!Number.isNaN(value)) {
                        await setFieldValue('percentage', value < 0 ? 0 : value, true);
                      }
                    }}
                    onBlur={handleBlur}
                    value={values.percentage}
                    disabled={isSubmitting}
                    type="number"
                    step="0.01"
                    className="mx-2 !inline-flex w-16 text-center"
                  />
                  <label htmlFor="percentage">Percent of Traffic</label>
                </div>
                <div>
                  <RadioGroupItem
                    id="requestCount"
                    key="requestCount"
                    value="REQUEST_COUNT"
                    disabled={isSubmitting}
                    data-cy="target-cbc-breakingChangeFormula-option-requestCount"
                  >
                    <RadioGroupIndicator />
                  </RadioGroupItem>
                  <Input
                    name="requestCount"
                    onChange={async event => {
                      const value = Math.round(Number(event.target.value));
                      if (!Number.isNaN(value)) {
                        await setFieldValue('requestCount', value <= 0 ? 1 : value, true);
                      }
                    }}
                    onBlur={handleBlur}
                    value={values.requestCount}
                    disabled={isSubmitting}
                    type="number"
                    step="1"
                    className="mx-2 !inline-flex w-16 text-center"
                  />
                  <label htmlFor="requestCount">Total Operations</label>
                </div>
              </RadioGroup>
            </div>
            <div>
              in the past
              <Input
                name="period"
                onChange={handleChange}
                onBlur={handleBlur}
                value={values.period}
                disabled={isSubmitting}
                type="number"
                min="1"
                max={targetSettings.data?.organization?.rateLimit.retentionInDays ?? 30}
                className="mx-2 !inline-flex w-16"
              />
              days.
            </div>
            <div className="mt-3">
              {touched.percentage && errors.percentage && (
                <div className="text-red-500">{errors.percentage}</div>
              )}
              {mutation.data?.updateTargetConditionalBreakingChangeConfiguration.error?.inputErrors
                .percentage && (
                <div className="text-red-500">
                  {
                    mutation.data.updateTargetConditionalBreakingChangeConfiguration.error
                      .inputErrors.percentage
                  }
                </div>
              )}
              {touched.requestCount && errors.requestCount && (
                <div className="text-red-500">{errors.requestCount}</div>
              )}
              {mutation.data?.updateTargetConditionalBreakingChangeConfiguration.error?.inputErrors
                .requestCount && (
                <div className="text-red-500">
                  {
                    mutation.data.updateTargetConditionalBreakingChangeConfiguration.error
                      .inputErrors.requestCount
                  }
                </div>
              )}
              {touched.period && errors.period && (
                <div className="text-red-500">{errors.period}</div>
              )}
              {mutation.data?.updateTargetConditionalBreakingChangeConfiguration.error?.inputErrors
                .period && (
                <div className="text-red-500">
                  {
                    mutation.data.updateTargetConditionalBreakingChangeConfiguration.error
                      .inputErrors.period
                  }
                </div>
              )}
            </div>
            <div className="space-y-6">
              <div>
                <div className="space-y-2">
                  <div>
                    <div className="font-semibold">Allow breaking change for these clients:</div>
                    <div className="text-xs text-gray-400">
                      Marks a breaking change as safe when it only affects the following clients.
                    </div>
                  </div>
                  <div className="max-w-[420px]">
                    {values.targetIds.length > 0 ? (
                      <ClientExclusion
                        organizationSlug={props.organizationSlug}
                        projectSlug={props.projectSlug}
                        selectedTargetIds={values.targetIds}
                        clientsFromSettings={configuration?.excludedClients ?? []}
                        name="excludedClients"
                        value={values.excludedClients}
                        onBlur={() => setFieldTouched('excludedClients')}
                        onChange={async options => {
                          await setFieldValue(
                            'excludedClients',
                            options.map(o => o.value),
                          );
                        }}
                        disabled={isSubmitting}
                      />
                    ) : (
                      <div className="text-gray-500">Select targets first</div>
                    )}
                  </div>
                  {touched.excludedClients && errors.excludedClients && (
                    <div className="text-red-500">{errors.excludedClients}</div>
                  )}
                </div>
              </div>
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
                      <Checkbox
                        checked={values.targetIds.includes(pt.id)}
                        onCheckedChange={async isChecked => {
                          await setFieldValue(
                            'targetIds',
                            isChecked
                              ? [...values.targetIds, pt.id]
                              : values.targetIds.filter(value => value !== pt.id),
                          );
                        }}
                        onBlur={() => setFieldTouched('targetIds', true)}
                      />{' '}
                      {pt.slug}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {touched.targetIds && errors.targetIds && (
              <div className="text-red-500">{errors.targetIds}</div>
            )}
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
            <Button type="submit" disabled={isSubmitting}>
              Save
            </Button>
            {mutation.error && (
              <span className="ml-2 text-red-500">
                {mutation.error.graphQLErrors[0]?.message ?? mutation.error.message}
              </span>
            )}
          </div>
        </SubPageLayout>
      </form>
    </>
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
        console.error('error', error);
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

function GraphQLEndpointUrl(props: {
  graphqlEndpointUrl: string | null;
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
}) {
  const { toast } = useToast();
  const [mutation, mutate] = useMutation(TargetSettingsPage_UpdateTargetGraphQLEndpointUrl);
  const { handleSubmit, values, handleChange, handleBlur, isSubmitting, errors, touched } =
    useFormik({
      enableReinitialize: true,
      initialValues: {
        graphqlEndpointUrl: props.graphqlEndpointUrl || '',
      },
      validationSchema: Yup.object().shape({
        graphqlEndpointUrl: Yup.string()
          .url('Please enter a valid url.')
          .min(1, 'Please enter a valid url.')
          .max(300, 'Max 300 chars.'),
      }),
      onSubmit: values =>
        mutate({
          input: {
            organizationSlug: props.organizationSlug,
            projectSlug: props.projectSlug,
            targetSlug: props.targetSlug,
            graphqlEndpointUrl: values.graphqlEndpointUrl === '' ? null : values.graphqlEndpointUrl,
          },
        }).then(result => {
          if (result.data?.updateTargetGraphQLEndpointUrl.error?.message || result.error) {
            toast({
              variant: 'destructive',
              title: 'Error',
              description:
                result.data?.updateTargetGraphQLEndpointUrl.error?.message || result.error?.message,
            });
          } else {
            toast({
              variant: 'default',
              title: 'Success',
              description: 'GraphQL endpoint url updated successfully',
            });
          }
        }),
    });

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
      <div>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-row items-center gap-x-2">
            <Input
              placeholder="Endpoint Url"
              name="graphqlEndpointUrl"
              value={values.graphqlEndpointUrl}
              onChange={handleChange}
              onBlur={handleBlur}
              disabled={isSubmitting}
              className="w-96"
            />
            <Button type="submit" disabled={isSubmitting}>
              Save
            </Button>
          </div>
          {touched.graphqlEndpointUrl && (errors.graphqlEndpointUrl || mutation.error) && (
            <div className="mt-2 text-red-500">
              {errors.graphqlEndpointUrl ??
                mutation.error?.graphQLErrors[0]?.message ??
                mutation.error?.message}
            </div>
          )}
          {mutation.data?.updateTargetGraphQLEndpointUrl.error && (
            <div className="mt-2 text-red-500">
              {mutation.data.updateTargetGraphQLEndpointUrl.error.message}
            </div>
          )}
        </form>
      </div>
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
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      project: projectBySlug(projectSlug: $projectSlug) {
        id
        slug
        type
        target: targetBySlug(targetSlug: $targetSlug) {
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
    }
  }
`);

function TargetInfo(props: { targetId: string }) {
  return (
    <div>
      <ResourceDetails id={props.targetId} />
    </div>
  );
}

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

  const currentOrganization = query.data?.organization;
  const currentProject = currentOrganization?.project;
  const currentTarget = currentProject?.target;

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

  if (!resolvedPage || !currentOrganization || !currentProject || !currentTarget) {
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
        <div className="space-y-12">
          {resolvedPage.key === 'general' ? (
            <>
              <TargetInfo targetId={currentTarget.id} />
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
              organizationSlug={props.organizationSlug}
              projectSlug={props.projectSlug}
              targetSlug={props.targetSlug}
            />
          ) : null}
          {resolvedPage.key === 'breaking-changes' ? (
            <BreakingChanges
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
    deleteTarget(input: { target: { bySelector: $selector } }) {
      ok {
        deletedTargetId
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
