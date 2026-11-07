import { useId, type ReactNode } from 'react';
import { Check, XIcon } from 'lucide-react';
import { useWatch, type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/primitives/button/button';
import { Checkbox } from '@/components/ui/primitives/checkbox/checkbox';
import { Form, FormField, FormItem, FormMessage } from '@/components/ui/primitives/form/form';
import { Label } from '@/components/ui/primitives/label/label';
import { DangerousChangeType } from '@/gql/graphql';
import * as shared from '@/styles/shared.css';
import { dangerousChangesFormStyles } from './dangerous-changes-form.css';

export const DangerousChangesFormSchema = z
  .object({
    failAllDangerousChanges: z.boolean(),
    failingChangeTypes: z.array(z.enum(DangerousChangeType)),
  })
  .superRefine((values, ctx) => {
    if (!values.failAllDangerousChanges && values.failingChangeTypes.length < 1) {
      ctx.addIssue({
        code: 'custom',
        path: ['failingChangeTypes'],
        message: 'Pick at least 1 change type, or fail them all',
      });
    }
  });

export type DangerousChangesFormValues = z.infer<typeof DangerousChangesFormSchema>;

/** One row per label; a row can stand for several change types that are toggled together. */
const dangerousChangeList = (
  [
    { label: 'INPUT_FIELD_DEFAULT_VALUE_CHANGED', types: ['INPUT_FIELD_DEFAULT_VALUE_CHANGED'] },
    { label: 'INPUT_FIELD_ADDED', types: ['INPUT_FIELD_ADDED'] },
    { label: 'OBJECT_TYPE_INTERFACE_ADDED', types: ['OBJECT_TYPE_INTERFACE_ADDED'] },
    { label: 'UNION_MEMBER_ADDED', types: ['UNION_MEMBER_ADDED'] },
    { label: 'FIELD_ARGUMENT_ADDED', types: ['FIELD_ARGUMENT_ADDED'] },
    { label: 'FIELD_ARGUMENT_DEFAULT_CHANGED', types: ['FIELD_ARGUMENT_DEFAULT_CHANGED'] },
    { label: 'ENUM_VALUE_ADDED', types: ['ENUM_VALUE_ADDED'] },
    {
      label: 'DIRECTIVE_USAGE_<KIND>_ADDED',
      types: [
        'DIRECTIVE_USAGE_ARGUMENT_ADDED',
        'DIRECTIVE_USAGE_ARGUMENT_DEFINITION_ADDED',
        'DIRECTIVE_USAGE_ENUM_ADDED',
        'DIRECTIVE_USAGE_FIELD_ADDED',
        'DIRECTIVE_USAGE_FIELD_DEFINITION_ADDED',
        'DIRECTIVE_USAGE_INPUT_FIELD_DEFINITION_ADDED',
        'DIRECTIVE_USAGE_OBJECT_ADDED',
        'DIRECTIVE_USAGE_SCALAR_ADDED',
        'DIRECTIVE_USAGE_SCHEMA_ADDED',
        'DIRECTIVE_USAGE_UNION_MEMBER_ADDED',
      ],
    },
    {
      label: 'DIRECTIVE_USAGE_<KIND>_REMOVED',
      types: [
        'DIRECTIVE_USAGE_ARGUMENT_REMOVED',
        'DIRECTIVE_USAGE_ARGUMENT_DEFINITION_REMOVED',
        'DIRECTIVE_USAGE_ENUM_REMOVED',
        'DIRECTIVE_USAGE_FIELD_REMOVED',
        'DIRECTIVE_USAGE_FIELD_DEFINITION_REMOVED',
        'DIRECTIVE_USAGE_INPUT_FIELD_DEFINITION_REMOVED',
        'DIRECTIVE_USAGE_OBJECT_REMOVED',
        'DIRECTIVE_USAGE_SCALAR_REMOVED',
        'DIRECTIVE_USAGE_SCHEMA_REMOVED',
        'DIRECTIVE_USAGE_UNION_MEMBER_REMOVED',
      ],
    },
    {
      label: 'DIRECTIVE_ARGUMENT_DEFAULT_VALUE_CHANGED',
      types: ['DIRECTIVE_ARGUMENT_DEFAULT_VALUE_CHANGED'],
    },
    { label: 'DIRECTIVE_REPEATABLE_REMOVED', types: ['DIRECTIVE_REPEATABLE_REMOVED'] },
  ] as { label: string; types: DangerousChangeType[] }[]
).sort((a, b) => a.label.localeCompare(b.label));

/** The dot beside a value that differs from what is saved. */
export function PendingIndicator() {
  return <span className={dangerousChangesFormStyles.pendingDot} />;
}

export function JustSavedLabel() {
  return (
    <div className={dangerousChangesFormStyles.justSaved}>
      <Check className={dangerousChangesFormStyles.justSavedIcon} />
      <span>Saved just now</span>
    </div>
  );
}

export function SavedLabel() {
  return (
    <div className={dangerousChangesFormStyles.saved}>
      <Check className={dangerousChangesFormStyles.savedIcon} />
      <span>All changes saved</span>
    </div>
  );
}

export function UnsavedChangesLabel() {
  return (
    <div className={dangerousChangesFormStyles.unsaved}>
      <PendingIndicator />
      <span>Unsaved changes</span>
    </div>
  );
}

function includesAll(selected: readonly DangerousChangeType[], types: DangerousChangeType[]) {
  return types.every(type => selected.includes(type));
}

/**
 * Which dangerous changes fail a check: every one, or a picked set. The page owns the mutation
 * and the saved-state label, and the form follows the target's saved selection.
 */
export function DangerousChangesForm(props: {
  form: UseFormReturn<DangerousChangesFormValues>;
  onSubmit: (values: DangerousChangesFormValues) => void | Promise<void>;
  /** Off while dangerous changes are not treated as breaking; the form is then shown greyed. */
  enabled: boolean;
  /** Saved, just saved or unsaved, beside the button. */
  status: ReactNode;
  /** The last save's failure, under the button. */
  error?: { title: string; description?: string };
}) {
  const { form } = props;
  const id = useId();
  const failAll = useWatch({ control: form.control, name: 'failAllDangerousChanges' });
  const selected = useWatch({ control: form.control, name: 'failingChangeTypes' });
  const saved = form.formState.defaultValues;
  const savedTypes = (saved?.failingChangeTypes ?? []) as DangerousChangeType[];

  function toggleTypes(types: DangerousChangeType[], checked: boolean) {
    const set = new Set(selected);
    for (const type of types) {
      if (checked) {
        set.add(type);
      } else {
        set.delete(type);
      }
    }
    form.setValue('failingChangeTypes', Array.from(set), {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  return (
    <div className={dangerousChangesFormStyles.root({ disabled: !props.enabled })}>
      <Form form={form} onSubmit={props.onSubmit}>
        <div className={dangerousChangesFormStyles.panel}>
          <div className={dangerousChangesFormStyles.panelTitle}>
            Select Failing Dangerous Change Types
          </div>
          <FormField
            control={form.control}
            name="failAllDangerousChanges"
            render={({ field }) => (
              <div className={dangerousChangesFormStyles.failAll}>
                <Checkbox
                  id={`${id}-all`}
                  disabled={!props.enabled}
                  checked={field.value}
                  onCheckedChange={checked => {
                    field.onChange(!!checked);
                    void form.trigger('failingChangeTypes');
                  }}
                />
                <Label htmlFor={`${id}-all`} variant="inline" label="Fail All Dangerous Changes" />
                <span
                  className={dangerousChangesFormStyles.failAllPending({
                    hidden: field.value === saved?.failAllDangerousChanges,
                  })}
                >
                  <PendingIndicator />
                </span>
              </div>
            )}
          />
          <div className={dangerousChangesFormStyles.orFailOnly}>or fail only:</div>
          <FormField
            control={form.control}
            name="failingChangeTypes"
            render={() => (
              <FormItem group>
                <div className={dangerousChangesFormStyles.changes}>
                  {dangerousChangeList.map(({ label, types }, index) => {
                    const checked = failAll || includesAll(selected, types);
                    const disabled = !props.enabled || failAll;
                    // Only the picked set is compared, so toggling "fail all" does not flag every row.
                    const changed =
                      !failAll && includesAll(selected, types) !== includesAll(savedTypes, types);
                    return (
                      <div className={dangerousChangesFormStyles.change} key={label}>
                        <Checkbox
                          id={`${id}-${index}`}
                          checked={checked}
                          disabled={disabled}
                          onCheckedChange={state => toggleTypes(types, !!state)}
                        />
                        <Label htmlFor={`${id}-${index}`} variant="inline" label={label} />
                        <span
                          className={dangerousChangesFormStyles.changePending({ hidden: !changed })}
                        >
                          <PendingIndicator />
                        </span>
                      </div>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className={dangerousChangesFormStyles.actions}>
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || !props.enabled || !form.formState.isDirty}
          >
            Save selections
          </Button>
          {props.status}
        </div>
        {props.error ? (
          <div className={dangerousChangesFormStyles.error}>
            <XIcon className={dangerousChangesFormStyles.errorIcon} />
            <span className={shared.weight.semibold}>{props.error.title}</span>
            <span>{props.error.description}</span>
          </div>
        ) : null}
      </Form>
    </div>
  );
}
