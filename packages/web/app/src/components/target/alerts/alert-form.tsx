import { useCallback, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useFieldArray, useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/base/accordion/accordion';
import { Button } from '@/components/base/button/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/base/card/card';
import { Select } from '@/components/base/floating/select/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';
import { RadioGroup, RadioItem } from '@/components/base/radio-group/radio-group';
import { useToast } from '@/components/ui/use-toast';
import { graphql } from '@/gql';
import {
  MetricAlertRuleDirection,
  MetricAlertRuleMetric,
  MetricAlertRuleSeverity,
  MetricAlertRuleThresholdType,
  MetricAlertRuleType,
} from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { AlertMetricChart } from './alert-metric-chart';
import { AlertPreview } from './alert-notification-preview';

const AlertForm_ChannelsQuery = graphql(`
  query AlertForm_ChannelsQuery($organizationSlug: String!, $projectSlug: String!) {
    project(
      reference: { bySelector: { organizationSlug: $organizationSlug, projectSlug: $projectSlug } }
    ) {
      id
      alertChannels {
        id
        name
        type
      }
    }
  }
`);

const AlertForm_SavedFiltersQuery = graphql(`
  query AlertForm_SavedFiltersQuery(
    $organizationSlug: String!
    $projectSlug: String!
    $targetSlug: String!
  ) {
    target(
      reference: {
        bySelector: {
          organizationSlug: $organizationSlug
          projectSlug: $projectSlug
          targetSlug: $targetSlug
        }
      }
    ) {
      id
      savedFilters(first: 50, visibility: SHARED) {
        edges {
          node {
            id
            name
            filters {
              operationHashes
              clientFilters {
                name
                versions
              }
              dateRange {
                from
                to
              }
              excludeOperations
              excludeClientFilters
            }
          }
        }
      }
    }
  }
`);

export const AlertForm_AddMetricAlertRuleMutation = graphql(`
  mutation AlertForm_AddMetricAlertRule($input: AddMetricAlertRuleInput!) {
    addMetricAlertRule(input: $input) {
      ok {
        addedMetricAlertRule {
          id
          name
        }
        updatedTarget {
          id
        }
      }
      error {
        message
      }
    }
  }
`);

const AlertForm_UpdateMetricAlertRuleMutation = graphql(`
  mutation AlertForm_UpdateMetricAlertRule($input: UpdateMetricAlertRuleInput!) {
    updateMetricAlertRule(input: $input) {
      ok {
        updatedMetricAlertRule {
          id
          name
          type
          metric
          severity
          state
          enabled
          timeWindowMinutes
          thresholdType
          thresholdValue
          direction
          confirmationMinutes
          channels {
            id
            name
            type
          }
          savedFilter {
            id
            name
            filters {
              operationHashes
              clientFilters {
                name
                versions
              }
              dateRange {
                from
                to
              }
              excludeOperations
              excludeClientFilters
            }
          }
          createdAt
          updatedAt
          createdBy {
            id
            displayName
          }
          updatedBy {
            id
            displayName
          }
        }
      }
      error {
        message
      }
    }
  }
`);

const METRIC_OPTIONS = [
  { value: 'TRAFFIC', label: 'Total requests' },
  { value: 'ERROR_RATE', label: 'Error rate' },
  { value: 'LATENCY:P75', label: 'p75 latency' },
  { value: 'LATENCY:P90', label: 'p90 latency' },
  { value: 'LATENCY:P95', label: 'p95 latency' },
  { value: 'LATENCY:P99', label: 'p99 latency' },
] as const;

const RANGE_OPTIONS = [
  { value: '1', label: '1m' },
  { value: '2', label: '2m' },
  { value: '3', label: '3m' },
  { value: '5', label: '5m' },
  { value: '15', label: '15m' },
  { value: '30', label: '30m' },
  { value: '60', label: '1h' },
  { value: '360', label: '6h' },
  { value: '1440', label: '1d' },
  { value: '10080', label: '7d' },
  { value: '20160', label: '14d' },
  { value: '43200', label: '30d' },
] as const;

const CONDITION_OPTIONS = [
  { value: 'ABOVE', label: 'Above' },
  { value: 'BELOW', label: 'Below' },
] as const;

const THRESHOLD_TYPE_OPTIONS = [
  { value: 'FIXED_VALUE', label: 'Fixed value' },
  // "% change vs. previous" names the behavior (window-over-window comparison)
  // rather than the unit. The old "Relative (%)" label leaned on "(%)" to set
  // itself apart, but for the error-rate metric a Fixed value is also a percent,
  // so the unit didn't actually distinguish the two options.
  { value: 'PERCENTAGE_CHANGE', label: '% change vs. previous' },
] as const;

const SEVERITIES = [
  { value: 'INFO' as const, label: 'Info', dotClass: 'bg-blue-400' },
  { value: 'WARNING' as const, label: 'Warning', dotClass: 'bg-yellow-400' },
  { value: 'CRITICAL' as const, label: 'Critical', dotClass: 'bg-red-400' },
];

export const AlertFormSchema = z.object({
  metricSelection: z.string().min(1, 'Metric is required'),
  timeWindowMinutes: z.string().min(1, 'Range is required'),
  name: z.string().min(1, 'Name is required'),
  severity: z.enum(['INFO', 'WARNING', 'CRITICAL']),
  direction: z.string().min(1),
  thresholdType: z.string().min(1),
  thresholdValue: z.string().min(1, 'Value is required'),
  savedFilterId: z.string().optional(),
  confirmationMinutes: z.string().default('0'),
  // Zero channels is intentionally allowed here so users can create a rule
  // and observe its state transitions in the UI without firing notifications
  // ("test mode"), then attach destinations once the rule's behavior is
  // trusted.
  channels: z.array(
    z.object({
      channelId: z.string().min(1, 'Select a channel'),
    }),
  ),
});

export type AlertFormValues = z.infer<typeof AlertFormSchema>;

const METRIC_TYPE_MAP: Record<string, MetricAlertRuleType> = {
  TRAFFIC: MetricAlertRuleType.Traffic,
  ERROR_RATE: MetricAlertRuleType.ErrorRate,
  LATENCY: MetricAlertRuleType.Latency,
};

const METRIC_MAP: Record<string, MetricAlertRuleMetric> = {
  AVG: MetricAlertRuleMetric.Avg,
  P75: MetricAlertRuleMetric.P75,
  P90: MetricAlertRuleMetric.P90,
  P95: MetricAlertRuleMetric.P95,
  P99: MetricAlertRuleMetric.P99,
};

const DIRECTION_MAP: Record<string, MetricAlertRuleDirection> = {
  ABOVE: MetricAlertRuleDirection.Above,
  BELOW: MetricAlertRuleDirection.Below,
};

const THRESHOLD_TYPE_MAP: Record<string, MetricAlertRuleThresholdType> = {
  FIXED_VALUE: MetricAlertRuleThresholdType.FixedValue,
  PERCENTAGE_CHANGE: MetricAlertRuleThresholdType.PercentageChange,
};

const SEVERITY_MAP: Record<string, MetricAlertRuleSeverity> = {
  INFO: MetricAlertRuleSeverity.Info,
  WARNING: MetricAlertRuleSeverity.Warning,
  CRITICAL: MetricAlertRuleSeverity.Critical,
};

function parseMetricSelection(selection: string): {
  type: MetricAlertRuleType;
  metric?: MetricAlertRuleMetric;
} {
  if (selection.startsWith('LATENCY:')) {
    const metricKey = selection.split(':')[1];
    return { type: MetricAlertRuleType.Latency, metric: METRIC_MAP[metricKey] };
  }
  return { type: METRIC_TYPE_MAP[selection] };
}

export const DEFAULT_ALERT_FORM_VALUES: AlertFormValues = {
  metricSelection: 'TRAFFIC',
  timeWindowMinutes: '10080',
  name: '',
  severity: 'WARNING',
  direction: 'ABOVE',
  thresholdType: 'FIXED_VALUE',
  thresholdValue: '',
  savedFilterId: '',
  confirmationMinutes: '0',
  channels: [],
};

export type AlertFormRuleSeed = {
  type: MetricAlertRuleType;
  metric?: string | null;
  name: string;
  severity: MetricAlertRuleSeverity;
  direction: string;
  thresholdType: MetricAlertRuleThresholdType;
  thresholdValue: number;
  timeWindowMinutes: number;
  confirmationMinutes: number;
  channels: ReadonlyArray<{ id: string }>;
  savedFilter?: { id: string } | null;
};

export function ruleToFormDefaults(rule: AlertFormRuleSeed): AlertFormValues {
  let metricSelection: string;
  if (rule.type === MetricAlertRuleType.Latency && rule.metric) {
    // METRIC_OPTIONS encodes the percentile uppercase (e.g. `LATENCY:P95`),
    // matching the `MetricAlertRuleMetric` enum values. Lowercasing here would
    // produce `LATENCY:p95`, which matches no option (Select shows "Select…")
    // and fails `parseMetricSelection`'s `METRIC_MAP` lookup on submit.
    metricSelection = `LATENCY:${rule.metric.toUpperCase()}`;
  } else if (rule.type === MetricAlertRuleType.ErrorRate) {
    metricSelection = 'ERROR_RATE';
  } else {
    metricSelection = 'TRAFFIC';
  }
  const severityKey = String(rule.severity).toUpperCase() as 'INFO' | 'WARNING' | 'CRITICAL';
  return {
    metricSelection,
    timeWindowMinutes: String(rule.timeWindowMinutes),
    name: rule.name,
    severity: severityKey,
    direction: String(rule.direction).toUpperCase(),
    thresholdType: String(rule.thresholdType).toUpperCase(),
    thresholdValue: String(rule.thresholdValue),
    savedFilterId: rule.savedFilter?.id ?? '',
    confirmationMinutes: String(rule.confirmationMinutes),
    channels: rule.channels.map(c => ({ channelId: c.id })),
  };
}

type AlertFormProps = {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  defaultValues?: AlertFormValues;
  showPreview?: boolean;
  /** When true, the "Advanced settings" accordion is expanded by default. */
  expandAdvanced?: boolean;
  onSuccess?: (ruleId: string) => void;
  onCancel?: () => void;
} & ({ mode: 'create' } | { mode: 'edit'; ruleId: string });

export function AlertForm(props: AlertFormProps) {
  const {
    organizationSlug,
    projectSlug,
    targetSlug,
    defaultValues,
    showPreview = false,
    expandAdvanced = false,
    onSuccess,
    onCancel,
    mode,
  } = props;
  const { toast } = useToast();

  const [channelsQuery] = useQuery({
    query: AlertForm_ChannelsQuery,
    variables: { organizationSlug, projectSlug },
  });

  const [savedFiltersQuery] = useQuery({
    query: AlertForm_SavedFiltersQuery,
    variables: { organizationSlug, projectSlug, targetSlug },
  });

  const [, addMetricAlertRule] = useMutation(AlertForm_AddMetricAlertRuleMutation);
  const [, updateMetricAlertRule] = useMutation(AlertForm_UpdateMetricAlertRuleMutation);

  const form = useForm<AlertFormValues>({
    resolver: zodResolver(AlertFormSchema),
    defaultValues: defaultValues ?? DEFAULT_ALERT_FORM_VALUES,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'channels',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = useCallback(
    async (values: AlertFormValues) => {
      setIsSubmitting(true);
      try {
        const { type, metric } = parseMetricSelection(values.metricSelection);

        if (mode === 'create') {
          const result = await addMetricAlertRule({
            input: {
              target: { bySelector: { organizationSlug, projectSlug, targetSlug } },
              name: values.name,
              type,
              metric: metric ?? null,
              timeWindowMinutes: parseInt(values.timeWindowMinutes, 10),
              thresholdType: THRESHOLD_TYPE_MAP[values.thresholdType],
              thresholdValue: parseFloat(values.thresholdValue),
              direction: DIRECTION_MAP[values.direction],
              severity: SEVERITY_MAP[values.severity],
              confirmationMinutes: parseInt(values.confirmationMinutes || '0', 10),
              channelIds: values.channels.map(c => c.channelId),
              savedFilterId: values.savedFilterId || null,
            },
          });

          if (result.data?.addMetricAlertRule.ok) {
            const ruleId = result.data.addMetricAlertRule.ok.addedMetricAlertRule.id;
            toast({ title: 'Alert created', description: `"${values.name}" has been created.` });
            onSuccess?.(ruleId);
          } else {
            toast({
              title: 'Failed to create alert',
              description: result.data?.addMetricAlertRule.error?.message ?? 'Unknown error',
              variant: 'destructive',
            });
          }
          return;
        }

        const result = await updateMetricAlertRule({
          input: {
            project: { bySelector: { organizationSlug, projectSlug } },
            ruleId: props.ruleId,
            name: values.name,
            type,
            metric: metric ?? null,
            timeWindowMinutes: parseInt(values.timeWindowMinutes, 10),
            thresholdType: THRESHOLD_TYPE_MAP[values.thresholdType],
            thresholdValue: parseFloat(values.thresholdValue),
            direction: DIRECTION_MAP[values.direction],
            severity: SEVERITY_MAP[values.severity],
            confirmationMinutes: parseInt(values.confirmationMinutes || '0', 10),
            channelIds: values.channels.map(c => c.channelId),
            savedFilterId: values.savedFilterId || null,
          },
        });

        if (result.data?.updateMetricAlertRule.ok) {
          const ruleId = result.data.updateMetricAlertRule.ok.updatedMetricAlertRule.id;
          toast({ title: 'Alert updated', description: `"${values.name}" has been updated.` });
          onSuccess?.(ruleId);
        } else {
          toast({
            title: 'Failed to update alert',
            description: result.data?.updateMetricAlertRule.error?.message ?? 'Unknown error',
            variant: 'destructive',
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      addMetricAlertRule,
      updateMetricAlertRule,
      mode,
      organizationSlug,
      projectSlug,
      targetSlug,
      onSuccess,
      toast,
      props,
    ],
  );

  const alertChannels = channelsQuery.data?.project?.alertChannels ?? [];

  const channelOptions = alertChannels.map(ch => ({
    value: ch.id,
    label: `${ch.name} (${ch.type})`,
  }));

  const watchedValues = form.watch();
  const metricOption = METRIC_OPTIONS.find(o => o.value === watchedValues.metricSelection);
  // Human-readable window label (e.g. "15m") for the threshold-type helper text.
  const thresholdRangeLabel =
    RANGE_OPTIONS.find(o => o.value === watchedValues.timeWindowMinutes)?.label ?? 'selected';

  // Parse once at the form boundary so downstream components don't need to
  // re-decode the colon-encoded Select value.
  const parsedMetric = watchedValues.metricSelection
    ? parseMetricSelection(watchedValues.metricSelection)
    : { type: MetricAlertRuleType.Traffic };

  const firstChannelId = watchedValues.channels?.[0]?.channelId;
  const firstChannel = firstChannelId
    ? alertChannels.find(ch => ch.id === firstChannelId)
    : undefined;

  const submitLabel =
    mode === 'create'
      ? isSubmitting
        ? 'Creating...'
        : 'Save alert'
      : isSubmitting
        ? 'Saving...'
        : 'Save changes';

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={showPreview ? 'flex gap-8' : undefined}
      >
        <div
          className={showPreview ? 'min-w-0 max-w-[700px] space-y-6' : 'min-w-0 flex-1 space-y-6'}
        >
          {/* Section 1: Destination */}
          <Card>
            <CardHeader>
              <CardTitle title="1. Destination" />
              <CardDescription
                description={
                  <>
                    Select the target destination for this alert. Configure destinations{' '}
                    <Link
                      to="/$organizationSlug/$projectSlug/view/alerts"
                      params={{ organizationSlug, projectSlug }}
                      className="text-accent underline"
                    >
                      here
                    </Link>
                    .
                  </>
                }
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-end gap-3">
                    <FormField
                      control={form.control}
                      name={`channels.${index}.channelId`}
                      render={({ field: channelField }) => (
                        <FormItem>
                          {index === 0 && <FormLabel label="Channel" />}
                          <FormControl>
                            <Select
                              options={channelOptions}
                              value={channelField.value}
                              onValueChange={channelField.onChange}
                              placeholder="Select a channel"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => remove(index)}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={() => append({ channelId: '' })}>
                  <Plus className="mr-1 size-3.5" />
                  {fields.length === 0 ? 'Add destination' : 'Add another destination'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Section 2: Alert type and range */}
          <Card>
            <CardHeader>
              <CardTitle title="2. Alert type and range" />
              <CardDescription description="Select the alert type and range for this alert." />
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <FormField
                  control={form.control}
                  name="metricSelection"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel label="Metric" />
                      <FormControl>
                        <Select
                          options={METRIC_OPTIONS}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timeWindowMinutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel label="Range" />
                      <FormControl>
                        <Select
                          options={RANGE_OPTIONS}
                          value={field.value}
                          onValueChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Alert name and severity */}
          <Card>
            <CardHeader>
              <CardTitle title="3. Alert name and severity" />
              <CardDescription description="Choose a name for your alert and the severity level." />
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel label="Alert name" />
                      <FormControl>
                        <Input placeholder="Some cool alert name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="severity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel label="Severity" />
                      <FormControl>
                        <RadioGroup value={field.value} onValueChange={field.onChange}>
                          {SEVERITIES.map(sev => (
                            <RadioItem
                              key={sev.value}
                              value={sev.value}
                              label={sev.label}
                              indicator={<span className={`size-2 rounded-full ${sev.dotClass}`} />}
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4: Condition, threshold, value */}
          <Card>
            <CardHeader>
              <CardTitle title="4. Condition, threshold, value" />
              <CardDescription description="Select the firing condition, threshold type, and value for this alert. Use advanced settings to debounce false positives." />
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col items-start gap-2">
                  <div className="flex gap-6">
                    <FormField
                      control={form.control}
                      name="direction"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel label="Condition" />
                          <FormControl>
                            <Select
                              options={CONDITION_OPTIONS}
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="thresholdType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel label="Threshold type" />
                          <FormControl>
                            <Select
                              options={THRESHOLD_TYPE_OPTIONS}
                              value={field.value}
                              onValueChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="thresholdValue"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel label="Value" />
                          <FormControl>
                            <Input type="number" placeholder="Enter a value" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <p className="text-neutral-10 text-[13px]">
                    {watchedValues.thresholdType === 'PERCENTAGE_CHANGE'
                      ? `"% change vs. previous" compares this ${thresholdRangeLabel} window to the one before it. Your value is the percent change between them, e.g. 75 fires on a +75% change rather than an absolute level.`
                      : `"Fixed value" compares the metric over the ${thresholdRangeLabel} window directly against your value, in the metric's own unit (% for error rate, ms for latency, requests for total requests).`}
                  </p>
                </div>

                <AlertMetricChart
                  organizationSlug={organizationSlug}
                  projectSlug={projectSlug}
                  targetSlug={targetSlug}
                  type={parsedMetric.type}
                  metric={parsedMetric.metric}
                  // Render ~2× the rule's evaluation window so a breach is
                  // visible alongside its surrounding context — picking a
                  // threshold from a chart that only shows the rule window
                  // hides what "normal" looks like just outside it. Capped
                  // at 30d to stay within sensible chart resolutions.
                  timeWindowMinutes={Math.min(
                    (parseInt(watchedValues.timeWindowMinutes, 10) || 10_080) * 2,
                    43_200,
                  )}
                  thresholdValue={
                    watchedValues.thresholdValue ? parseFloat(watchedValues.thresholdValue) : null
                  }
                  direction={watchedValues.direction}
                  thresholdType={watchedValues.thresholdType}
                />

                <Accordion defaultValue={expandAdvanced ? [0] : undefined}>
                  <AccordionItem value={0}>
                    <AccordionTrigger label="Advanced settings" variant="accent" />
                    <AccordionContent>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="savedFilterId"
                          render={({ field }) => {
                            const isLoading = savedFiltersQuery.fetching;
                            const savedFilterOptions = [
                              {
                                value: '',
                                label: isLoading
                                  ? 'Loading filters...'
                                  : 'No filter (all operations)',
                              },
                              ...(savedFiltersQuery.data?.target?.savedFilters?.edges?.map(
                                edge => ({
                                  value: edge.node.id,
                                  label: edge.node.name,
                                }),
                              ) ?? []),
                            ];

                            return (
                              <FormItem>
                                <FormLabel label="On filter" />
                                <FormControl>
                                  <Select
                                    options={savedFilterOptions}
                                    value={field.value || ''}
                                    onValueChange={field.onChange}
                                    placeholder="Select a filter name"
                                    searchable={savedFilterOptions.length > 10}
                                  />
                                </FormControl>
                                <FormDescription description="Only shared filters can be attached to alerts." />
                              </FormItem>
                            );
                          }}
                        />
                        <FormField
                          control={form.control}
                          name="confirmationMinutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel label="Hold minutes" />
                              <FormControl>
                                <Input type="number" min={0} {...field} />
                              </FormControl>
                              <FormDescription
                                description={
                                  <>
                                    Wait for the condition to exist for{' '}
                                    <span className="text-neutral-12 font-medium">
                                      {field.value || '0'}
                                    </span>{' '}
                                    minutes before firing. Helps prevent false alarms from brief
                                    spikes. Leave at 0 to fire immediately (recommended for alert
                                    ranges greater than 1 day).
                                  </>
                                }
                              />
                            </FormItem>
                          )}
                        />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
              {submitLabel}
            </Button>
          </div>
        </div>

        {showPreview ? (
          <div className="sticky top-6 min-w-0 flex-1 self-start">
            <AlertPreview
              alertName={watchedValues.name}
              metricLabel={metricOption?.label ?? 'Total requests'}
              alertType={parsedMetric.type}
              severity={watchedValues.severity ?? 'WARNING'}
              direction={watchedValues.direction ?? 'ABOVE'}
              thresholdType={watchedValues.thresholdType ?? 'FIXED_VALUE'}
              thresholdValue={watchedValues.thresholdValue ?? ''}
              channelType={
                (firstChannel?.type as 'SLACK' | 'WEBHOOK' | 'MSTEAMS_WEBHOOK' | null) ?? null
              }
              targetSlug={targetSlug}
              projectSlug={projectSlug}
            />
          </div>
        ) : null}
      </form>
    </Form>
  );
}
