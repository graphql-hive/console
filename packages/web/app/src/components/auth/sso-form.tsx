import { type ReactNode } from 'react';
import { CircleHelp } from 'lucide-react';
import { type UseFormReturn } from 'react-hook-form';
import z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';

export const SSOFormSchema = z.object({
  slug: z
    .string({
      required_error: 'Slug is required',
    })
    .toLowerCase(),
});

export type SSOFormValues = z.infer<typeof SSOFormSchema>;

/** The organization slug field of the SSO sign-in page. */
export function SSOForm(props: {
  form: UseFormReturn<SSOFormValues>;
  onSubmit: (values: SSOFormValues) => void;
  submit: ReactNode;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="slug"
        render={() => (
          <FormItem>
            <FormLabel
              label="Organization slug"
              icon={CircleHelp}
              tooltip={`The organization slug is the unique identifier used in your organization's URLs. For instance, in app.graphql-hive.com/acme, "acme" is the slug.`}
            />
            <FormControl>
              <Input placeholder="acme" onSurface="raised" {...form.register('slug')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {props.submit}
    </Form>
  );
}
