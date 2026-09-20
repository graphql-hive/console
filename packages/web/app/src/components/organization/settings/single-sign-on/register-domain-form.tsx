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

const FQDNModel = z
  .string()
  .min(3, 'Must be at least 3 characters long')
  .max(255, 'Must be at most 255 characters long.')
  .regex(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]+$/, 'Invalid domain provided.');

export const RegisterDomainFormSchema = z.object({
  domainName: FQDNModel,
});

export type RegisterDomainFormValues = z.infer<typeof RegisterDomainFormSchema>;

/** The first step of the domain sheet. The sheet owns the form state and submits from its footer. */
export function RegisterDomainForm(props: {
  form: UseFormReturn<RegisterDomainFormValues>;
  onSubmit: (values: RegisterDomainFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="domainName"
        render={({ field }) => (
          <FormItem>
            <FormLabel
              label="Domain Name"
              tooltip="The domain you want to register with this OIDC provider."
            />
            <FormControl>
              <Input placeholder="example.com" autoComplete="off" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
