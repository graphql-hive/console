import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Select } from '@/components/base/floating/select/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/base/form/form';
import { Input } from '@/components/base/input/input';
import { useSlugs } from '@/lib/hooks';

/** The dialog footer's submit button lives outside the form and targets it by this id. */
export const TRANSFER_OWNERSHIP_FORM_ID = 'transfer-ownership-form';

/** The confirmation has to be the organization's own slug, so the schema is built per organization. */
export function transferOwnershipFormSchema(organizationSlug: string) {
  return z.object({
    newOwner: z.string().min(1, 'New owner is not defined'),
    confirmation: z
      .string()
      .refine(value => value === organizationSlug, 'Type organization name to confirm'),
  });
}

export type TransferOwnershipFormValues = z.infer<ReturnType<typeof transferOwnershipFormSchema>>;

export type TransferableMember = {
  id: string;
  fullName: string;
  displayName: string;
  email: string;
};

/** The body of the transfer ownership dialog. The dialog owns the form state and the mutation. */
export function TransferOwnershipForm(props: {
  form: UseFormReturn<TransferOwnershipFormValues>;
  onSubmit: (values: TransferOwnershipFormValues) => void | Promise<void>;
  members: readonly TransferableMember[];
}) {
  const { organizationSlug } = useSlugs('organization');
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit} attrs={{ id: TRANSFER_OWNERSHIP_FORM_ID }}>
      <FormField
        control={form.control}
        name="newOwner"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="New owner" />
            <FormControl>
              <Select
                name={field.name}
                placeholder="Select a member"
                searchable
                searchPlaceholder="Search by name or email..."
                options={props.members.map(member => ({
                  value: member.id,
                  label: member.displayName,
                  description: member.email,
                  keywords: `${member.fullName} ${member.email}`,
                }))}
                value={field.value}
                onValueChange={field.onChange}
                // No onBlur: the popup takes focus as it opens, which would blur the trigger and
                // flag the field before anyone has chosen.
                width="full"
                onSurface="raised"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="confirmation"
        render={({ field }) => (
          <FormItem>
            <FormLabel
              label="Type the name of this organization to confirm"
              tooltip={`This organization is named "${organizationSlug}".`}
            />
            <FormControl>
              <Input autoComplete="off" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
