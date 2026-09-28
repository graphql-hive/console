import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/base/button/button';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import {
  NEW_TICKET_FORM_ID,
  NewTicketForm,
  NewTicketFormSchema,
  type NewTicketFormValues,
} from '@/components/organization/new-ticket-form';
import {
  ReplyTicketForm,
  ReplyTicketFormSchema,
  type ReplyTicketFormValues,
} from '@/components/organization/reply-ticket-form';
import { SupportTicketPriority } from '@/gql/graphql';
import { zodResolver } from '@hookform/resolvers/zod';

export const nav: NavPath = 'Components/SupportForms';

/**
 * The real support forms, mounted the way their pages mount them. The pages themselves need a
 * Zendesk-backed server to render, so this is where they can be seen locally. What a submit
 * hands over is printed under each form.
 */

function Submitted(props: { values: unknown }) {
  return props.values ? (
    <pre className="text-fg-default mt-4 text-xs">{JSON.stringify(props.values, null, 2)}</pre>
  ) : null;
}

/** organization-support.tsx: the sheet opened by "New ticket", submitted from its footer. */
export const NewTicket = createPreview(() => {
  const [open, setOpen] = useState(false);
  const [submitted, setSubmitted] = useState<NewTicketFormValues | null>(null);
  const form = useForm<NewTicketFormValues>({
    resolver: zodResolver(NewTicketFormSchema),
    defaultValues: { subject: '', priority: SupportTicketPriority.Normal, description: '' },
  });
  return (
    <div>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        onOpenChangeComplete={isOpen => {
          if (!isOpen) {
            form.reset();
          }
        }}
        trigger={<Button>New ticket</Button>}
        title="New ticket"
        description="Create a new case for the support team"
        footer={
          <Button type="submit" form={NEW_TICKET_FORM_ID} onSurface="raised">
            Submit
          </Button>
        }
      >
        <NewTicketForm
          form={form}
          onSubmit={values => {
            setSubmitted(values);
            setOpen(false);
          }}
        />
      </Sheet>
      <Submitted values={submitted} />
    </div>
  );
});

/** organization-support-ticket.tsx: the reply box under a ticket's comments. */
export const Reply = createPreview(() => {
  const [submitted, setSubmitted] = useState<ReplyTicketFormValues | null>(null);
  const form = useForm<ReplyTicketFormValues>({
    resolver: zodResolver(ReplyTicketFormSchema),
    defaultValues: { body: '' },
  });
  return (
    <div className="max-w-xl">
      <ReplyTicketForm
        form={form}
        onSubmit={values => {
          setSubmitted(values);
          form.reset({ body: '' });
        }}
      />
      <Submitted values={submitted} />
    </div>
  );
});
