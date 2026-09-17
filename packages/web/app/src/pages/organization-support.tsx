import { useCallback } from 'react';
import { PencilIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { z } from 'zod';
import { DataTable } from '@/components/base/data-table/data-table';
import { DataTableCell } from '@/components/base/data-table/data-table-cell';
import { Input } from '@/components/base/input/input';
import { Sheet } from '@/components/base/overlays/sheet/sheet';
import { RadioGroup } from '@/components/base/radio-group/radio-group';
import { Textarea } from '@/components/base/textarea/textarea';
import { OrganizationLayout, Page } from '@/components/layouts/organization';
import { priorityDescription } from '@/components/organization/support';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { useToast } from '@/components/ui/use-toast';
import { FragmentType, graphql, useFragment, type DocumentType } from '@/gql';
import { SupportTicketPriority, SupportTicketStatus } from '@/gql/graphql';
import { useToggle } from '@/lib/hooks';
import { zodResolver } from '@hookform/resolvers/zod';
import type { ColumnDef } from '@tanstack/react-table';

const PRIORITY_ITEMS = [
  SupportTicketPriority.Normal,
  SupportTicketPriority.High,
  SupportTicketPriority.Urgent,
].map(priority => ({
  value: priority,
  label: priority.charAt(0) + priority.slice(1).toLowerCase(),
  description: priorityDescription[priority],
}));

const newTicketFormSchema = z.object({
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

type NewTicketFormValues = z.infer<typeof newTicketFormSchema>;

const NewTicketForm_SupportTicketCreateMutation = graphql(`
  mutation NewTicketForm_SupportTicketCreateMutation($input: SupportTicketCreateInput!) {
    supportTicketCreate(input: $input) {
      ok {
        supportTicketId
      }
      error {
        message
      }
    }
  }
`);

function NewTicketForm(props: {
  organizationSlug: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const { toast } = useToast();
  const form = useForm<NewTicketFormValues>({
    resolver: zodResolver(newTicketFormSchema),
    defaultValues: {
      subject: '',
      priority: SupportTicketPriority.Normal,
      description: '',
    },
  });
  const [_, mutate] = useMutation(NewTicketForm_SupportTicketCreateMutation);

  function failed(message: string) {
    toast({ variant: 'destructive', title: 'Failed to submit your ticket', description: message });
  }

  async function onSubmit(data: NewTicketFormValues) {
    try {
      const result = await mutate({
        input: {
          organizationSlug: props.organizationSlug,
          subject: data.subject,
          priority: data.priority,
          description: data.description,
        },
      });

      if (result.error) {
        failed(result.error.message);
        return;
      }

      if (result.data?.supportTicketCreate.ok) {
        toast({ title: 'Your ticket has been submitted.' });
        props.onSubmit();
      } else if (result.data?.supportTicketCreate.error) {
        failed(result.data.supportTicketCreate.error.message);
      }
    } catch (error) {
      failed(String(error));
    }
  }

  return (
    <Sheet
      open={props.isOpen}
      onOpenChange={open => {
        if (!open) {
          props.onClose();
        }
      }}
      onOpenChangeComplete={open => {
        if (!open) {
          form.reset();
        }
      }}
      title="New ticket"
      description="Create a new case for the support team"
      footer={
        <Button type="submit" form="new-ticket-form">
          Submit
        </Button>
      }
    >
      <Form {...form}>
        <form
          id="new-ticket-form"
          className="space-y-6 text-sm"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>Priority level</FormLabel>
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
                <FormLabel>Subject</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter a subject of your issue"
                    onSurface="raised"
                    {...field}
                  />
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
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter a short description of your issue"
                    onSurface="raised"
                    {...field}
                  />
                </FormControl>
                <FormDescription>Help us understand it better.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </form>
      </Form>
    </Sheet>
  );
}

const SupportTicketRow_SupportTicket = graphql(`
  fragment SupportTicketRow_SupportTicket on SupportTicket {
    id
    status
    priority
    updatedAt
    subject
  }
`);

type SupportTicket = DocumentType<typeof SupportTicketRow_SupportTicket>;

const STATUS_BADGE = {
  [SupportTicketStatus.Open]: 'info',
  [SupportTicketStatus.Solved]: 'success',
} as const;

const PRIORITY_DOT = {
  [SupportTicketPriority.Normal]: 'info',
  [SupportTicketPriority.High]: 'warning',
  [SupportTicketPriority.Urgent]: 'critical',
} as const;

const titleCase = (value: string) => value.charAt(0) + value.slice(1).toLowerCase();

const Support_OrganizationFragment = graphql(`
  fragment Support_OrganizationFragment on Organization {
    id
    slug
    supportTickets {
      ...Support_SupportTicketConnection
    }
  }
`);

const Support_SupportTicketConnection = graphql(`
  fragment Support_SupportTicketConnection on SupportTicketConnection {
    edges {
      node {
        id
        ...SupportTicketRow_SupportTicket
      }
    }
  }
`);

function Support(props: {
  organization: FragmentType<typeof Support_OrganizationFragment>;
  refetch: () => void;
}) {
  const organization = useFragment(Support_OrganizationFragment, props.organization);
  const supportTicketsConnection = useFragment(
    Support_SupportTicketConnection,
    organization.supportTickets,
  );
  const [isOpen, toggle] = useToggle();
  const onSubmit = useCallback(() => {
    toggle();
    props.refetch();
  }, [toggle, props.refetch]);

  const tickets = useFragment(
    SupportTicketRow_SupportTicket,
    supportTicketsConnection?.edges.map(e => e.node) ?? [],
  );

  const columns: ColumnDef<SupportTicket, unknown>[] = [
    {
      id: 'id',
      header: 'ID',
      meta: { align: 'center', width: 'xs' },
      cell: ({ row }) => <DataTableCell kind="text" value={row.original.id} mono />,
    },
    {
      id: 'subject',
      header: 'Subject',
      meta: { width: 'fill' },
      cell: ({ row }) => (
        <DataTableCell
          kind="link"
          label={row.original.subject}
          link={{
            to: '/$organizationSlug/view/support/ticket/$ticketId',
            params: { organizationSlug: organization.slug, ticketId: row.original.id },
          }}
        />
      ),
    },
    {
      id: 'status',
      header: 'Status',
      meta: { align: 'center', width: 'sm' },
      cell: ({ row }) => (
        <DataTableCell
          kind="badge"
          items={{
            content: titleCase(row.original.status),
            variant: STATUS_BADGE[row.original.status],
          }}
        />
      ),
    },
    {
      id: 'priority',
      header: 'Priority',
      meta: { width: 'sm' },
      cell: ({ row }) => (
        <DataTableCell
          kind="status"
          label={titleCase(row.original.priority)}
          dot={PRIORITY_DOT[row.original.priority]}
          tooltip={priorityDescription[row.original.priority]}
        />
      ),
    },
    {
      id: 'updatedAt',
      header: 'Last updated',
      meta: { align: 'right', width: 'md' },
      cell: ({ row }) => <DataTableCell kind="time" date={row.original.updatedAt} tone="muted" />,
    },
  ];

  return (
    <>
      <div>
        <div className="flex flex-row items-center justify-between py-6">
          <div>
            <Title>Support</Title>
            <Subtitle>A list of support requests</Subtitle>
          </div>
          <div>
            <Button variant="outline" onClick={toggle}>
              <PencilIcon className="mr-2 size-4" />
              New ticket
            </Button>
            <NewTicketForm
              isOpen={isOpen}
              onClose={toggle}
              organizationSlug={organization.slug}
              onSubmit={onSubmit}
            />
          </div>
        </div>
        <div className="flex flex-col gap-y-4">
          <DataTable
            data={tickets}
            columns={columns}
            getRowId={ticket => ticket.id}
            pagination={{ kind: 'none' }}
            emptyMessage="No support tickets yet."
            rowState={ticket =>
              ticket.status === SupportTicketStatus.Solved ? { muted: true } : undefined
            }
          />
        </div>
      </div>
    </>
  );
}

const SupportPageQuery = graphql(`
  query SupportPageQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      ...Support_OrganizationFragment
    }
  }
`);

function SupportPageContent(props: { organizationSlug: string }) {
  const [query, refetchQuery] = useQuery({
    query: SupportPageQuery,
    variables: {
      organizationSlug: props.organizationSlug,
    },
    requestPolicy: 'cache-first',
  });

  const refetch = useCallback(() => {
    refetchQuery({ requestPolicy: 'cache-and-network' });
  }, [refetchQuery]);

  if (query.error) {
    return <QueryError organizationSlug={props.organizationSlug} error={query.error} />;
  }

  const currentOrganization = query.data?.organization;

  return (
    <OrganizationLayout
      page={Page.Support}
      organizationSlug={props.organizationSlug}
      className="flex flex-col gap-y-10"
    >
      {currentOrganization ? (
        <Support organization={currentOrganization} refetch={refetch} />
      ) : null}
    </OrganizationLayout>
  );
}

export function OrganizationSupportPage(props: { organizationSlug: string }) {
  return (
    <>
      <Meta title="Support" />
      <SupportPageContent organizationSlug={props.organizationSlug} />
    </>
  );
}
