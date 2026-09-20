import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';

/** The dialog footer's submit button lives outside the form and targets it by this id. */
export const CDN_TOKEN_FORM_ID = 'create-cdn-access-token-form';

export const CdnTokenFormSchema = z.object({
  alias: z
    .string()
    .min(1, 'Please enter an alias')
    .min(3, 'Alias must be at least 3 characters')
    .max(100, 'Alias must be at most 100 characters'),
});

export type CdnTokenFormValues = z.infer<typeof CdnTokenFormSchema>;

/** The body of the create CDN token dialog. The dialog owns the form state and the mutation. */
export function CdnTokenForm(props: {
  form: UseFormReturn<CdnTokenFormValues>;
  onSubmit: (values: CdnTokenFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit} attrs={{ id: CDN_TOKEN_FORM_ID }}>
      <FormField
        control={form.control}
        name="alias"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="CDN Access Token Alias" />
            <FormControl>
              <Input placeholder="Alias" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
