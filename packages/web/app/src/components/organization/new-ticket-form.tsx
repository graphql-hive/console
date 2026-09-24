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
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Textarea } from '@/components/base/textarea/textarea';
import { SupportTicketPriority } from '@/gql/graphql';
import { priorityDescription } from './support';

/** The sheet footer's submit button lives outside the form and targets it by this id. */
export const NEW_TICKET_FORM_ID = 'new-ticket-form';

const PRIORITY_ITEMS = [
  SupportTicketPriority.Normal,
  SupportTicketPriority.High,
  SupportTicketPriority.Urgent,
].map(priority => {
  const label = priority.charAt(0) + priority.slice(1).toLowerCase();
  return {
    value: priority,
    label,
    ariaLabel: label,
    description: priorityDescription[priority],
  };
});

export const NewTicketFormSchema = z.object({
  subject: z.string().min(2, {
    message: 'Subject must be at least 2 characters.',
  }),
  priority: z.nativeEnum(SupportTicketPriority, {
    required_error: 'A priority is required.',
  }),
  description: z.string().min(5, {
    message: 'Description must be at least 5 characters.',
  }),
});

export type NewTicketFormValues = z.infer<typeof NewTicketFormSchema>;

/** The body of the new-ticket sheet. The page owns the sheet, the form state and the mutation. */
export function NewTicketForm(props: {
  form: UseFormReturn<NewTicketFormValues>;
  onSubmit: (values: NewTicketFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit} attrs={{ id: NEW_TICKET_FORM_ID }}>
      <FormField
        control={form.control}
        name="priority"
        render={({ field }) => (
          <FormItem group>
            <FormLabel label="Priority level" />
            <RadioGroup
              variant="as-card"
              onSurface="raised"
              orientation="vertical"
              value={field.value}
              onValueChange={field.onChange}
              items={PRIORITY_ITEMS}
            />
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="subject"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Subject" />
            <FormControl>
              <Input placeholder="Enter a subject of your issue" onSurface="raised" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel label="Description" tooltip="Help us understand it better." />
            <FormControl>
              <Textarea
                placeholder="Enter a short description of your issue"
                onSurface="raised"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}
