import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/base/button/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';

export const CreateTargetFormSchema = z.object({
  targetSlug: z
    .string({
      required_error: 'Target slug is required',
    })
    .min(2, {
      message: 'Target slug must be at least 2 characters long',
    })
    .max(50, {
      message: 'Target slug must be at most 50 characters long',
    }),
});

export type CreateTargetFormValues = z.infer<typeof CreateTargetFormSchema>;

/**
 * The body of the create-target dialog. The layout owns the dialog, the form state and the
 * mutation, so this can be exercised on its own.
 */
export function CreateTargetForm(props: {
  form: UseFormReturn<CreateTargetFormValues>;
  onSubmit: (values: CreateTargetFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="targetSlug"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Input placeholder="my-target" autoComplete="off" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="mt-3">
        <Button
          width="full"
          onSurface="raised"
          type="submit"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          {form.formState.isSubmitting ? 'Submitting...' : 'Create Target'}
        </Button>
      </div>
    </Form>
  );
}
