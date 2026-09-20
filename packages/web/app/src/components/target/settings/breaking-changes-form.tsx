import { useId, type ReactNode } from 'react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Badge } from '@/components/base/badge/badge';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Form, FormField, FormItem, FormMessage } from '@/components/base/form/form';
import { numberInput } from '@/components/base/form/number-input';
import { Input } from '@/components/base/input/input';
import { Label } from '@/components/base/label/label';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Button } from '@/components/base/button/button';
import { BreakingChangeFormulaType } from '@/gql/graphql';
import { cn } from '@/lib/utils';

/**
 * The period is capped by the organization's usage retention, so the schema is built per page.
 * The percentage and the request count are each required only under their own formula.
 */
export function breakingChangesFormSchema(maxPeriod: number) {
  return z
    .object({
      percentage: numberInput(z.number().optional()),
      requestCount: numberInput(z.number().int('Must be a whole number').optional()),
      period: numberInput(
        z
          .number({ required_error: 'Required' })
          .min(1, 'Must be at least 1 day')
          .max(maxPeriod, `Must be at most ${maxPeriod} days`)
          .refine(value => Number(value.toFixed(2)) === value, 'Invalid precision'),
      ),
      breakingChangeFormula: z.nativeEnum(BreakingChangeFormulaType),
      targetIds: z.array(z.string()).min(1, 'Pick at least 1 target'),
      excludedClients: z.array(z.string()),
      excludedAppDeployments: z.array(z.string()),
    })
    .superRefine((values, ctx) => {
      if (values.breakingChangeFormula === BreakingChangeFormulaType.Percentage) {
        if (values.percentage === undefined) {
          ctx.addIssue({ code: 'custom', path: ['percentage'], message: 'Required' });
        } else if (values.percentage < 0 || values.percentage > 100) {
          ctx.addIssue({
            code: 'custom',
            path: ['percentage'],
            message: 'Must be between 0 and 100',
          });
        }
      }
      if (values.breakingChangeFormula === BreakingChangeFormulaType.RequestCount) {
        if (values.requestCount === undefined) {
          ctx.addIssue({ code: 'custom', path: ['requestCount'], message: 'Required' });
        } else if (values.requestCount < 1) {
          ctx.addIssue({ code: 'custom', path: ['requestCount'], message: 'Must be at least 1' });
        }
      }
    });
}

export type BreakingChangesFormValues = z.infer<ReturnType<typeof breakingChangesFormSchema>>;

/** What an exclusion picker gets from the form: the picked names and how to change them. */
export type ExclusionField = {
  name: string;
  value: string[];
  onChange: (values: string[]) => void;
  onBlur: () => void;
  disabled?: boolean;
};

const NUMBER_FIELDS = ['percentage', 'requestCount', 'period'] as const;

/**
 * The conditional breaking-change rules. The page owns the mutation and supplies the two
 * exclusion pickers, which run their own queries. The numbers sit inside sentences and radio
 * cards, so their messages are listed under the period line instead of under each field.
 */
export function BreakingChangesForm(props: {
  form: UseFormReturn<BreakingChangesFormValues>;
  onSubmit: (values: BreakingChangesFormValues) => void | Promise<void>;
  /** Off while the feature is switched off; the rules are then shown greyed and inert. */
  enabled: boolean;
  maxPeriod: number;
  targets: readonly { id: string; slug: string }[];
  clientExclusion: (field: ExclusionField, targetIds: string[]) => ReactNode;
  appDeploymentExclusion: (field: ExclusionField) => ReactNode;
  /** The last save's failure, beside the button. */
  error?: string;
}) {
  const { form } = props;
  const id = useId();
  const targetIds = useWatch({ control: form.control, name: 'targetIds' });
  const { errors } = form.formState;
  const messages = NUMBER_FIELDS.flatMap(name => {
    const message = errors[name]?.message;
    return typeof message === 'string' ? [{ name, message }] : [];
  });

  function number(
    name: 'percentage' | 'requestCount' | 'period',
    label: string,
    attrs: { min?: number; max?: number; step?: number },
  ) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field, fieldState }) => (
          <Input
            {...field}
            aria-label={label}
            aria-invalid={fieldState.invalid || undefined}
            type="number"
            width="xs"
            {...attrs}
          />
        )}
      />
    );
  }

  return (
    <div className={cn('text-neutral-11', !props.enabled && 'pointer-events-none opacity-25')}>
      <Form form={form} onSubmit={props.onSubmit}>
        <div>
          <div>A schema change is considered as breaking only if it affects more than</div>
          <div className="my-2 w-auto max-w-4xl">
            <FormField
              control={form.control}
              name="breakingChangeFormula"
              render={({ field }) => (
                <RadioGroup
                  variant="as-card"
                  orientation="vertical"
                  disabled={field.disabled}
                  value={field.value}
                  onValueChange={field.onChange}
                  items={[
                    {
                      value: BreakingChangeFormulaType.Percentage,
                      ariaLabel: 'Percent of Traffic',
                      withIndicator: true,
                      content: (
                        <span
                          data-cy="target-cbc-breakingChangeFormula-option-percentage"
                          className="inline-flex items-center gap-2"
                        >
                          {number('percentage', 'Percent of traffic', { step: 0.01 })}
                          Percent of Traffic
                        </span>
                      ),
                    },
                    {
                      value: BreakingChangeFormulaType.RequestCount,
                      ariaLabel: 'Total Operations',
                      withIndicator: true,
                      content: (
                        <span
                          data-cy="target-cbc-breakingChangeFormula-option-requestCount"
                          className="inline-flex items-center gap-2"
                        >
                          {number('requestCount', 'Total operations', { step: 1 })}
                          Total Operations
                        </span>
                      ),
                    },
                  ]}
                />
              )}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span>in the past</span>
            {number('period', 'Period in days', { min: 1, max: props.maxPeriod })}
            <span>days.</span>
          </div>
          {messages.length ? (
            <div className="text-critical mt-3 space-y-1">
              {messages.map(({ name, message }) => (
                <div key={name}>{message}</div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <div>
              <div className="font-semibold">Allow breaking change for these clients:</div>
              <div className="text-neutral-10 text-xs">
                Marks a breaking change as safe when it only affects the following clients.
              </div>
            </div>
            <div className="max-w-[420px]">
              <FormField
                control={form.control}
                name="excludedClients"
                render={({ field }) =>
                  targetIds.length > 0 ? (
                    <>{props.clientExclusion(field, targetIds)}</>
                  ) : (
                    <div className="text-neutral-10">Select targets first</div>
                  )
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <div>
              <div className="font-semibold">Allow breaking change for these app deployments:</div>
              <div className="text-neutral-10 text-xs">
                Marks a breaking change as safe when it only affects the following app deployments.
              </div>
            </div>
            <div className="max-w-[420px]">
              <FormField
                control={form.control}
                name="excludedAppDeployments"
                render={({ field }) => <>{props.appDeploymentExclusion(field)}</>}
              />
            </div>
          </div>
          <FormField
            control={form.control}
            name="targetIds"
            render={({ field }) => (
              <FormItem group>
                <div>
                  <div className="font-semibold">Schema usage data from these targets:</div>
                  <div className="text-neutral-10 text-xs">
                    Marks a breaking change as safe when it was not requested in the targets
                    clients.
                  </div>
                </div>
                <div className="space-y-2 pl-2">
                  {props.targets.map(target => (
                    <div key={target.id} className="flex items-center gap-x-2">
                      <Checkbox
                        id={`${id}-${target.id}`}
                        checked={field.value.includes(target.id)}
                        disabled={field.disabled}
                        onCheckedChange={checked =>
                          field.onChange(
                            checked
                              ? [...field.value, target.id]
                              : field.value.filter(value => value !== target.id),
                          )
                        }
                        onBlur={field.onBlur}
                      />
                      <Label htmlFor={`${id}-${target.id}`} variant="inline" label={target.slug} />
                    </div>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="border-neutral-5 bg-neutral-8/10 text-neutral-10 w-auto max-w-4xl space-y-2 rounded-sm border py-2 pl-5">
          <div>
            <div className="font-semibold">Example settings</div>
            <div className="text-sm">Removal of a field is considered breaking if</div>
          </div>
          <div className="text-sm">
            <Badge content="0%" variants={{ variant: 'warning' }} /> - the field was used at least
            once in past 30 days
          </div>
          <div className="text-sm">
            <Badge content="10%" variants={{ variant: 'warning' }} /> - the field was requested by
            more than 10% of all GraphQL operations in recent 30 days
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={form.formState.isSubmitting}>
            Save
          </Button>
          {props.error ? <span className="text-critical">{props.error}</span> : null}
        </div>
      </Form>
    </div>
  );
}
