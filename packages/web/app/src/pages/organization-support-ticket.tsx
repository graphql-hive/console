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
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from '@tanstack/react-router';
import * as styles from './organization-support-ticket.css';

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
    <div className={cn(styles.commentDiv, isSupport ? styles.commentDiv2 : styles.commentDiv3)}>
      {isSupport ? null : <UserIcon className={styles.commentUserIcon} />}
      <Tooltip
        trigger={
          <div
            className={cn(styles.commentDiv4, isSupport ? styles.commentDiv5 : styles.commentDiv6)}
          >
            {comment.body}
          </div>
        }
        content={<TimeAgo date={comment.createdAt} className={styles.commentTimeAgo} />}
        side="bottom"
      />
      {isSupport ? (
        <img className={styles.commentImg} src="/just-logo.svg" alt="Hive Console logo" />
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
      <div className={styles.supportTicketDiv}>
        <div className={styles.supportTicketDiv2}>
          <div className={styles.supportTicketDiv3}>
            <Title className={styles.supportTicketTitle}>
              <Link
                to="/$organizationSlug/view/support"
                params={{
                  organizationSlug: organization.slug,
                }}
                className={styles.supportTicketLink}
              >
                Tickets
              </Link>
              <span className={styles.supportTicketSpan}>
                <ChevronRightIcon className={styles.supportTicketChevronRightIcon} />
              </span>
              <span>{ticket.subject}</span>
            </Title>
            <Subtitle>Support ticket detailed view</Subtitle>
            <div className={styles.supportTicketDiv4}>
              {comments.map(comment => (
                <Comment key={comment.node.id} node={comment.node} />
              ))}

              <div className={styles.supportTicketDiv5}>
                <ReplyTicket ticketId={ticket.id} onSubmit={props.refetch} />
              </div>
            </div>
          </div>
          <div className={styles.supportTicketDiv6}>
            <div className={styles.supportTicketDiv7}>
              <div className={styles.supportTicketDiv8}>
                <div className={styles.supportTicketDiv9}>Support Ticket ID</div>
                <div className={styles.supportTicketDiv10}>{ticket.id}</div>
              </div>
              <div className={styles.supportTicketDiv11}>
                <div className={styles.supportTicketDiv12}>Status</div>
                <div className={styles.supportTicketDiv13}>
                  {ticket.status}
                  <div className={styles.supportTicketDiv14}>
                    {statusDescription[ticket.status]}
                  </div>
                </div>
              </div>
              <div className={styles.supportTicketDiv15}>
                <div className={styles.supportTicketDiv16}>Priority</div>
                <div className={styles.supportTicketDiv17}>
                  {ticket.priority}
                  <div className={styles.supportTicketDiv18}>
                    {priorityDescription[ticket.priority]}
                  </div>
                </div>
              </div>
              <div className={styles.supportTicketDiv19}>
                <div className={styles.supportTicketDiv20}>Last updated</div>
                <div>
                  <TimeAgo date={ticket.updatedAt} className={styles.supportTicketTimeAgo} />
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
    <LayoutContent className={styles.supportTicketPageContentLayoutContent}>
      {currentOrganization ? (
        ticket ? (
          <SupportTicket organization={currentOrganization} ticket={ticket} refetch={refetch} />
        ) : (
          <div className={styles.supportTicketPageContentDiv}>
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
