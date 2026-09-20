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
import { PasswordStringModel } from './sign-up-form';

export const ResetPasswordFormSchema = z.object({
  email: z
    .string({
      required_error: 'Email is required',
    })
    .email('Invalid email address'),
});

export type ResetPasswordFormValues = z.infer<typeof ResetPasswordFormSchema>;

/** The first step of the reset-password page: the address to send the reset link to. */
export function ResetPasswordEmailForm(props: {
  form: UseFormReturn<ResetPasswordFormValues>;
  onSubmit: (values: ResetPasswordFormValues) => void;
  submit: ReactNode;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Email" />
            <FormControl>
              <Input placeholder="m@example.com" type="email" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {props.submit}
    </Form>
  );
}

export const NewPasswordFormSchema = z.object({
  newPassword: PasswordStringModel,
});

export type NewPasswordFormValues = z.infer<typeof NewPasswordFormSchema>;

/** The second step, reached from the emailed link: the replacement password. */
export function NewPasswordForm(props: {
  form: UseFormReturn<NewPasswordFormValues>;
  onSubmit: (values: NewPasswordFormValues) => void;
  submit: ReactNode;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="newPassword"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="New password" />
            <FormControl>
              <Input type="password" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {props.submit}
    </Form>
  );
}
