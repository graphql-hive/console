import { type ReactNode } from 'react';
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

export const SignInFormSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email address'),
  password: z.string(),
});

export type SignInFormValues = z.infer<typeof SignInFormSchema>;

/**
 * The email and password fields of the sign-in page. The page owns the form state, the mutation
 * and the submit button, so this can be exercised on its own.
 */
export function SignInForm(props: {
  form: UseFormReturn<SignInFormValues>;
  onSubmit: (values: SignInFormValues) => void;
  /** The submit control, which the page wraps with its last-used marker. */
  submit: ReactNode;
  /** The reset link beside the password label. */
  forgotPasswordLink: ReactNode;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="email"
        render={() => (
          <FormItem>
            <FormLabel label="Email" />
            <FormControl>
              <Input
                placeholder="m@example.com"
                type="email"
                onSurface="raised"
                {...form.register('email')}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="password"
        render={() => (
          <FormItem>
            <div className="flex items-center">
              <FormLabel label="Password" />
              {props.forgotPasswordLink}
            </div>
            <FormControl>
              <Input type="password" onSurface="raised" {...form.register('password')} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {props.submit}
    </Form>
  );
}
