import { type ReactNode } from 'react';
import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';
import { Button } from '@/components/base/button/button';
import { RoleSelector } from './common';

export const MemberInvitationFormSchema = z.object({
  email: z
    .string({
      required_error: 'Please enter email address',
    })
    .max(128, 'Email address is too long')
    .email('Please enter valid email address'),
  role: z
    .string({
      required_error: 'Please select a role',
    })
    .min(1, 'Please select a role'),
});

export type MemberInvitationFormValues = z.infer<typeof MemberInvitationFormSchema>;

export type InvitableRole = {
  id: string;
  name: string;
  description: string;
  isLocked: boolean;
  canInvite: boolean;
};

/**
 * The body of the invitation dialog: who to invite and as what, then the resources they get. The
 * dialog owns the form state, the mutation and the resource selection.
 */
export function MemberInvitationForm(props: {
  form: UseFormReturn<MemberInvitationFormValues>;
  onSubmit: (values: MemberInvitationFormValues) => void | Promise<void>;
  roles: readonly InvitableRole[];
  /** Shown in the selector until the form's role value names another role. */
  defaultRole: InvitableRole;
  /** The resource picker between the fields and the submit. */
  resources: ReactNode;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <div className="flex flex-row items-start gap-6">
        <div className="grow">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input placeholder="Enter an email" type="email" onSurface="raised" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <RoleSelector
                onSurface="raised"
                roles={props.roles}
                defaultRole={props.roles.find(role => role.id === field.value) ?? props.defaultRole}
                isRoleActive={role => ({
                  active: role.canInvite,
                  reason: role.canInvite ? undefined : 'Not enough permissions',
                })}
                onSelect={role => {
                  field.onChange(role.id);
                  field.onBlur();
                }}
                onBlur={field.onBlur}
                disabled={field.disabled}
              />
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {props.resources}
      <div className="flex justify-end">
        <Button
          type="submit"
          onSurface="raised"
          disabled={form.formState.isSubmitting || !form.formState.isValid}
        >
          {form.formState.isSubmitting ? 'Sending invitation...' : 'Send invitation'}
        </Button>
      </div>
    </Form>
  );
}
