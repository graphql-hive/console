import { type UseFormReturn } from 'react-hook-form';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/base/form/form';
import { Textarea } from '@/components/base/textarea/textarea';
import { Button } from '@/components/ui/button';

export const ReplyTicketFormSchema = z.object({
  body: z.string().min(2, {
    message: 'Comment must be at least 2 characters.',
  }),
});

export type ReplyTicketFormValues = z.infer<typeof ReplyTicketFormSchema>;

/** The reply box under a support ticket. The page owns the form state and the mutation. */
export function ReplyTicketForm(props: {
  form: UseFormReturn<ReplyTicketFormValues>;
  onSubmit: (values: ReplyTicketFormValues) => void | Promise<void>;
}) {
  const { form } = props;
  return (
    <Form form={form} onSubmit={props.onSubmit}>
      <FormField
        control={form.control}
        name="body"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <Textarea placeholder="Type your comment here." aria-label="Reply" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="-mt-5 flex flex-row gap-x-4">
        <Button type="submit">Reply</Button>
        <Button variant="link" type="reset" onClick={() => form.reset({ body: '' })}>
          Reset
        </Button>
      </div>
    </Form>
  );
}
