import { type ComponentProps } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/base/button/button';
import { Select } from '@/components/base/floating/select/select';
import { Form, FormField } from '@/components/base/form/form';
import { numberInput } from '@/components/base/form/number-input';
import { Input } from '@/components/base/input/input';
import { AppDeploymentProtectionRuleLogicType } from '@/gql/graphql';
import { cn } from '@/lib/utils';

const wholeDays = (min: number, minMessage: string) =>
  numberInput(
    z.number({ required_error: 'Required' }).int('Must be a whole number').min(min, minMessage),
  );

export const AppDeploymentProtectionFormSchema = z.object({
  minDaysSinceCreation: wholeDays(0, 'Must be at least 0'),
  minDaysInactive: wholeDays(0, 'Must be at least 0'),
  maxTrafficPercentage: numberInput(
    z
      .number({ required_error: 'Required' })
      .min(0, 'Must be at least 0')
      .max(100, 'Must be at most 100'),
  ),
  trafficPeriodDays: wholeDays(1, 'Must be at least 1'),
  ruleLogic: z.nativeEnum(AppDeploymentProtectionRuleLogicType),
});

export type AppDeploymentProtectionFormValues = z.infer<typeof AppDeploymentProtectionFormSchema>;

const NUMBER_FIELDS = [
  'minDaysSinceCreation',
  'minDaysInactive',
  'maxTrafficPercentage',
  'trafficPeriodDays',
] as const;

/**
 * The retirement rules, written as a sentence with the numbers inline. A sentence has no room
 * for a message line under each number, so the messages are listed under it instead.
 */
export function AppDeploymentProtectionForm(props: {
  form: UseFormReturn<AppDeploymentProtectionFormValues>;
  onSubmit: (values: AppDeploymentProtectionFormValues) => void | Promise<void>;
  /** Off while protection is switched off; the rules are then shown greyed and inert. */
  enabled: boolean;
  /** The last save's failure, beside the button. */
  error?: string;
}) {
  const { form } = props;
  const { errors } = form.formState;

  function number(
    name: (typeof NUMBER_FIELDS)[number],
    label: string,
    attrs: Pick<ComponentProps<typeof Input>, 'min' | 'max' | 'step'>,
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

  const messages = NUMBER_FIELDS.flatMap(name => {
    const message = errors[name]?.message;
    return typeof message === 'string' ? [{ name, message }] : [];
  });

  return (
    <div className={cn('text-neutral-10', !props.enabled && 'pointer-events-none opacity-25')}>
      <Form form={form} onSubmit={props.onSubmit}>
        <div className="space-y-4">
          <div>
            <div className="mb-2">An app deployment can only be retired if it</div>
            <div className="ml-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span>was created at least</span>
                {number('minDaysSinceCreation', 'Minimum days since creation', { min: 0 })}
                <span>days ago and has not been used for at least</span>
                {number('minDaysInactive', 'Minimum days inactive', { min: 0 })}
                <span>days</span>
              </div>
              <div className="flex items-center gap-2">
                <FormField
                  control={form.control}
                  name="ruleLogic"
                  render={({ field }) => (
                    <Select
                      aria-label="Rule logic"
                      name={field.name}
                      options={[
                        { value: AppDeploymentProtectionRuleLogicType.And, label: 'AND' },
                        { value: AppDeploymentProtectionRuleLogicType.Or, label: 'OR' },
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      width="auto"
                    />
                  )}
                />
                <span>has less than</span>
                {number('maxTrafficPercentage', 'Maximum traffic percentage', {
                  min: 0,
                  max: 100,
                  step: 0.01,
                })}
                <span>percent of traffic over the last</span>
                {number('trafficPeriodDays', 'Traffic period in days', { min: 1 })}
                <span>days</span>
              </div>
            </div>
          </div>
          <div className="text-neutral-11 text-sm">
            The creation date check always applies. The inactivity and traffic checks only apply if
            the app deployment has usage data.
          </div>
        </div>
        {messages.length ? (
          <div className="text-critical space-y-1">
            {messages.map(({ name, message }) => (
              <div key={name}>{message}</div>
            ))}
          </div>
        ) : null}
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
