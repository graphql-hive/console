import { useCallback, useMemo } from 'react';
import { ChevronRightIcon, UserIcon } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import {
  ReplyTicketForm,
  ReplyTicketFormSchema,
  type ReplyTicketFormValues,
} from '@/components/organization/reply-ticket-form';
import { priorityDescription, statusDescription } from '@/components/organization/support';
import { Meta } from '@/components/ui/meta';
import { NotFound } from '@/components/ui/not-found/not-found';
import { Subtitle, Title } from '@/components/ui/page';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { useToast } from '@/components/ui/primitives/toast/toast';
import { QueryError } from '@/components/ui/query-error';
import { TimeAgo } from '@/components/ui/time-ago';
import { FragmentType, graphql, useFragment } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import * as shared from '@/styles/shared.css';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import { organizationSupportTicketStyles } from './organization-support-ticket.css';

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
      className={organizationSupportTicketStyles.comment({ side: isSupport ? 'support' : 'user' })}
    >
      {isSupport ? null : <UserIcon className={organizationSupportTicketStyles.commentUserIcon} />}
      <Tooltip
        trigger={
          <div
            className={organizationSupportTicketStyles.commentBubble({
              side: isSupport ? 'support' : 'user',
            })}
          >
            {comment.body}
          </div>
        }
        content={
          <TimeAgo
            date={comment.createdAt}
            className={organizationSupportTicketStyles.commentTime}
          />
        }
        side="bottom"
      />
      {isSupport ? (
        <img
          className={organizationSupportTicketStyles.commentLogo}
          src="/just-logo.svg"
          alt="Hive Console logo"
        />
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
      <div className={organizationSupportTicketStyles.root}>
        <div className={organizationSupportTicketStyles.layout}>
          <div className={organizationSupportTicketStyles.thread}>
            <Title className={organizationSupportTicketStyles.title}>
              <Link
                to="/$organizationSlug/view/support"
                params={{
                  organizationSlug: organization.slug,
                }}
                className={organizationSupportTicketStyles.titleLink}
              >
                Tickets
              </Link>
              <span className={organizationSupportTicketStyles.titleSubject}>
                <ChevronRightIcon className={organizationSupportTicketStyles.titleChevron} />
              </span>
              <span>{ticket.subject}</span>
            </Title>
            <Subtitle>Support ticket detailed view</Subtitle>
            <div className={organizationSupportTicketStyles.comments}>
              {comments.map(comment => (
                <Comment key={comment.node.id} node={comment.node} />
              ))}

              <div className={organizationSupportTicketStyles.reply}>
                <ReplyTicket ticketId={ticket.id} onSubmit={props.refetch} />
              </div>
            </div>
          </div>
          <div className={organizationSupportTicketStyles.details}>
            <div className={organizationSupportTicketStyles.detailsList}>
              <div className={organizationSupportTicketStyles.detail}>
                <div className={organizationSupportTicketStyles.detailLabel}>Support Ticket ID</div>
                <div className={shared.fg.secondary}>{ticket.id}</div>
              </div>
              <div className={organizationSupportTicketStyles.detail}>
                <div className={organizationSupportTicketStyles.detailLabel}>Status</div>
                <div className={shared.fg.secondary}>
                  {ticket.status}
                  <div className={shared.text.xs}>{statusDescription[ticket.status]}</div>
                </div>
              </div>
              <div className={organizationSupportTicketStyles.detail}>
                <div className={organizationSupportTicketStyles.detailLabel}>Priority</div>
                <div className={shared.fg.secondary}>
                  {ticket.priority}
                  <div className={shared.text.xs}>{priorityDescription[ticket.priority]}</div>
                </div>
              </div>
              <div className={organizationSupportTicketStyles.detail}>
                <div className={organizationSupportTicketStyles.detailLabel}>Last updated</div>
                <div>
                  <TimeAgo
                    date={ticket.updatedAt}
                    className={organizationSupportTicketStyles.detailTime}
                  />
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

export const SupportTicketPageQuery = graphql(`
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
    <LayoutContent className={organizationSupportTicketStyles.page}>
      {currentOrganization ? (
        ticket ? (
          <SupportTicket organization={currentOrganization} ticket={ticket} refetch={refetch} />
        ) : (
          <div className={organizationSupportTicketStyles.pending}>
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
