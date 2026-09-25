import { useCallback, useMemo } from 'react';
import { ChevronRightIcon, UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { Tooltip } from '@/components/base/floating/tooltip/tooltip';
import { NotFound } from '@/components/base/not-found/not-found';
import { useToast } from '@/components/base/toast/toast';
import { LayoutContent } from '@/components/layouts/layout-content';
import {
  ReplyTicketForm,
  ReplyTicketFormSchema,
  type ReplyTicketFormValues,
} from '@/components/organization/reply-ticket-form';
import { priorityDescription, statusDescription } from '@/components/organization/support';
import { Meta } from '@/components/ui/meta';
import { Subtitle, Title } from '@/components/ui/page';
import { QueryError } from '@/components/ui/query-error';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';

const ReplyTicketForm_SupportTicketReplyMutation = graphql(`
  mutation ReplyTicketForm_SupportTicketReplyMutation($input: SupportTicketReplyInput!) {
    supportTicketReply(input: $input) {
      ok {
        supportTicketId
      }
      error {
        message
      }
    }
  }
`);

function ReplyTicket(props: { ticketId: string; onSubmit: () => void }) {
  const { organizationSlug } = useSlugs('organization');
  const { toast } = useToast();
  const form = useForm<ReplyTicketFormValues>({
    resolver: zodResolver(ReplyTicketFormSchema),
    defaultValues: {
      body: '',
    },
  });
  const [_, mutate] = useMutation(ReplyTicketForm_SupportTicketReplyMutation);

  async function onSubmit(data: ReplyTicketFormValues) {
    try {
      const result = await mutate({
        input: {
          organizationSlug,
          ticketId: props.ticketId,
          body: data.body,
        },
      });

      if (result.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to reply',
          description: result.error.message,
        });
        return;
      }

      if (result.data?.supportTicketReply.ok) {
        props.onSubmit();
        toast({ title: 'Replied to the ticket.' });
        form.reset({ body: '' });
      } else if (result.data?.supportTicketReply.error) {
        toast({
          variant: 'destructive',
          title: 'Failed to reply',
          description: result.data.supportTicketReply.error.message,
        });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Failed to reply', description: String(error) });
    }
  }

  return <ReplyTicketForm form={form} onSubmit={onSubmit} />;
}

const Comment_SupportTicketComment = graphql(`
  fragment Comment_SupportTicketComment on SupportTicketComment {
    id
    createdAt
    body
    fromSupport
  }
`);

function Comment({ node }: { node: FragmentType<typeof Comment_SupportTicketComment> }) {
  const comment = useFragment(Comment_SupportTicketComment, node);

  const isSupport = comment.fromSupport;

  return (
    <div
      className={cn(
        'flex w-full flex-row items-end space-x-2',
        isSupport ? 'justify-end' : 'justify-start',
      )}
    >
      {isSupport ? null : <UserIcon className="text-accent size-6" />}
      <Tooltip
        trigger={
          <div
            className={cn(
              'text-neutral-11 bg-neutral-5 inline-block max-w-[70%] rounded-lg p-2 text-left',
              isSupport ? 'rounded-br-none' : 'rounded-bl-none',
            )}
          >
            {comment.body}
          </div>
        }
        content={<TimeAgo date={comment.createdAt} className="text-neutral-10" />}
        side="bottom"
      />
      {isSupport ? (
        <img className="block size-6" src="/just-logo.svg" alt="Hive Console logo" />
      ) : null}
    </div>
  );
}

const SupportTicket_SupportTicketFragment = graphql(`
  fragment SupportTicket_SupportTicketFragment on SupportTicket {
    id
    status
    priority
    updatedAt
    subject
    description
    comments {
      edges {
        node {
          id
          ...Comment_SupportTicketComment
        }
      }
    }
  }
`);

function SupportTicket(props: {
  ticket: FragmentType<typeof SupportTicket_SupportTicketFragment>;
  organization: FragmentType<typeof SupportTicket_OrganizationFragment>;
  refetch: () => void;
}) {
  const ticket = useFragment(SupportTicket_SupportTicketFragment, props.ticket);
  const organization = useFragment(SupportTicket_OrganizationFragment, props.organization);

  const commentEdges = ticket.comments?.edges;
  const comments = useMemo(() => {
    if (!!commentEdges && commentEdges.length > 0) {
      return commentEdges.slice().reverse();
    }

    return [];
  }, [commentEdges]);

  return (
    <>
      <div className="py-6">
        <div className="flex flex-row items-start justify-between gap-x-6">
          <div className="border-neutral-5 flex-1 border-r pr-6">
            <Title className="flex flex-row items-center gap-x-2">
              <Link
                to="/$organizationSlug/view/support"
                params={{
                  organizationSlug: organization.slug,
                }}
                className="text-accent text-lg font-semibold tracking-tight underline-offset-4 hover:underline"
              >
                Tickets
              </Link>
              <span className="text-neutral-10 text-lg font-semibold tracking-tight">
                <ChevronRightIcon className="size-4" />
              </span>
              <span>{ticket.subject}</span>
            </Title>
            <Subtitle>Support ticket detailed view</Subtitle>
            <div className="space-y-6 py-12">
              {comments.map(comment => (
                <Comment key={comment.node.id} node={comment.node} />
              ))}

              <div className="mt-6">
                <ReplyTicket ticketId={ticket.id} onSubmit={props.refetch} />
              </div>
            </div>
          </div>
          <div className="w-1/3 shrink-0 text-sm">
            <div className="flex flex-col gap-y-6 text-left">
              <div className="space-y-0">
                <div className="text-neutral-12 font-semibold">Support Ticket ID</div>
                <div className="text-neutral-10">{ticket.id}</div>
              </div>
              <div className="space-y-0">
                <div className="text-neutral-12 font-semibold">Status</div>
                <div className="text-neutral-10">
                  {ticket.status}
                  <div className="text-xs">{statusDescription[ticket.status]}</div>
                </div>
              </div>
              <div className="space-y-0">
                <div className="text-neutral-12 font-semibold">Priority</div>
                <div className="text-neutral-10">
                  {ticket.priority}
                  <div className="text-xs">{priorityDescription[ticket.priority]}</div>
                </div>
              </div>
              <div className="space-y-0">
                <div className="text-neutral-12 font-semibold">Last updated</div>
                <div>
                  <TimeAgo date={ticket.updatedAt} className="text-neutral-10 text-xs" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const SupportTicket_OrganizationFragment = graphql(`
  fragment SupportTicket_OrganizationFragment on Organization {
    id
    slug
  }
`);

const SupportTicketPageQuery = graphql(`
  query SupportTicketPageQuery($organizationSlug: String!, $ticketId: ID!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      ...SupportTicket_OrganizationFragment
      supportTicket(id: $ticketId) {
        ...SupportTicket_SupportTicketFragment
      }
    }
  }
`);

function SupportTicketPageContent(props: { ticketId: string }) {
  const { organizationSlug } = useSlugs('organization');
  const ticketId = props.ticketId as string;
  const [query, refetchQuery] = useQuery({
    query: SupportTicketPageQuery,
    variables: {
      organizationSlug,
      ticketId,
    },
    requestPolicy: 'cache-first',
  });

  const refetch = useCallback(() => {
    refetchQuery({ requestPolicy: 'cache-and-network' });
  }, [refetchQuery]);

  if (query.error) {
    return <QueryError organizationSlug={organizationSlug} error={query.error} />;
  }

  const currentOrganization = query.data?.organization;
  const ticket = currentOrganization?.supportTicket;

  return (
    <LayoutContent className="flex flex-col gap-y-10">
      {currentOrganization ? (
        ticket ? (
          <SupportTicket organization={currentOrganization} ticket={ticket} refetch={refetch} />
        ) : (
          <div className="py-6">
            <NotFound
              title="Support ticket not found."
              description="The support ticket you are looking for does not exist or you do not have access to it."
            />
          </div>
        )
      ) : null}
    </LayoutContent>
  );
}

export function OrganizationSupportTicketPage(props: { ticketId: string }) {
  return (
    <>
      <Meta title={`Support Ticket #${props.ticketId}`} />
      <SupportTicketPageContent ticketId={props.ticketId} />
    </>
  );
}
