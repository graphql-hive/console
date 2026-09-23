import { type ReactNode } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Accordion } from '@/components/base/accordion/accordion';
import { Button } from '@/components/base/button/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';

export const RegistryTokenFormSchema = z.object({
  tokenDescription: z
    .string({
      required_error: 'Token description is required',
    })
    .min(2, {
      message: 'Token description must be at least 2 characters long',
    })
    .max(50, {
      message: 'Token description must be at most 50 characters long',
    })
    .regex(
      /^([a-z]|[0-9]|\s|\.|,|_|-|\/|&)+$/i,
      'Token description restricted to alphanumerical characters, spaces and . , _ - / &',
    ),
});

export type RegistryTokenFormValues = z.infer<typeof RegistryTokenFormSchema>;

/**
 * The body of the registry token dialog. The dialog owns the form state, the scope selection and
 * the mutation, and passes the scope picker in.
 */
export function RegistryTokenForm(props: {
  form: UseFormReturn<RegistryTokenFormValues>;
  onSubmit: (values: RegistryTokenFormValues) => void | Promise<void>;
  /** The scope picker, under the "Registry & Usage" disclosure. */
  permissions: ReactNode;
  noPermissionsSelected: boolean;
  onCancel: () => void;
}) {
  const { form } = props;
  return (
    // The buttons stay inside the form: the e2e helper selects the submit through it.
    <Form form={form} onSubmit={props.onSubmit} attrs={{ 'data-cy': 'create-registry-token-form' }}>
      <FormField
        control={form.control}
        name="tokenDescription"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input
                placeholder="Token description"
                aria-label="Token description"
                data-cy="description"
                autoComplete="off"
                onSurface="raised"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <Accordion
        variant="plain"
        defaultValue={['Permissions']}
        items={[
          {
            value: 'Permissions',
            label: 'Registry & Usage',
            content: props.permissions,
          },
        ]}
      />
      <div className="flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={props.onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          data-cy="submit"
          onSurface="raised"
          disabled={
            !form.formState.isValid || props.noPermissionsSelected || form.formState.isSubmitting
          }
        >
          Generate Token
        </Button>
      </div>
    </Form>
  );
}
