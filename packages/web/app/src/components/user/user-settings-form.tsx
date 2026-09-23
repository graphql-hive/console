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
export const USER_SETTINGS_FORM_ID = 'user-settings-form';

export const UserSettingsFormSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  displayName: z.string().min(1, 'Display name is required'),
});

export type UserSettingsFormValues = z.infer<typeof UserSettingsFormSchema>;

/** The body of the profile settings dialog. The dialog owns the form state and the mutation. */
export function UserSettingsForm(props: {
  form: UseFormReturn<UserSettingsFormValues>;
  onSubmit: (values: UserSettingsFormValues) => void | Promise<void>;
  /** The last save's failure, under the fields. */
  error?: string;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit} attrs={{ id: USER_SETTINGS_FORM_ID }}>
      <FormField
        control={form.control}
        name="fullName"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Full name" />
            <FormControl>
              <Input placeholder="Full name" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="displayName"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Display name" />
            <FormControl>
              <Input placeholder="Display name" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      {props.error ? <div className="text-critical text-sm">{props.error}</div> : null}
    </Form>
  );
}
