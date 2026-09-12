import { SupportTicketPriority, SupportTicketStatus } from '@/gql/graphql';
import { relayConnection, type RelayConnection } from './connection';
import { createFixtureFaker, fixtureNow } from './faker';

// The fields the support pages select (SupportTicketRow_SupportTicket,
// SupportTicket_SupportTicketFragment, Comment_SupportTicketComment). Anything the
// UI adds later is filled in by the mock layer, so this only needs to cover realism.
export type SupportTicketCommentFixture = {
  __typename: 'SupportTicketComment';
  id: string;
  createdAt: string;
  body: string;
  fromSupport: boolean;
};

export type SupportTicketFixture = {
  __typename: 'SupportTicket';
  id: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  createdAt: string;
  updatedAt: string;
  subject: string;
  description: string;
  comments: RelayConnection<
    SupportTicketCommentFixture,
    'SupportTicketCommentConnection',
    'SupportTicketCommentEdge'
  >;
};

export type SupportTicketsFixture = RelayConnection<
  SupportTicketFixture,
  'SupportTicketConnection',
  'SupportTicketEdge'
>;

export type SupportTicketsOptions = {
  count: number;
  statuses?: SupportTicketStatus[];
  priorities?: SupportTicketPriority[];
  commentsPerTicket?: number;
  seed?: number;
  /** Reference date for "recent" timestamps. Defaults to the start of today. */
  now?: Date;
};

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export function supportTickets(options: SupportTicketsOptions): SupportTicketsFixture {
  const faker = createFixtureFaker(options.seed);
  const refDate = options.now ?? fixtureNow();
  const statuses = options.statuses ?? [SupportTicketStatus.Open, SupportTicketStatus.Solved];
  const priorities = options.priorities ?? [
    SupportTicketPriority.Normal,
    SupportTicketPriority.High,
    SupportTicketPriority.Urgent,
  ];
  const commentsPerTicket = options.commentsPerTicket ?? 2;

  const tickets = Array.from({ length: options.count }, (_, i): SupportTicketFixture => {
    const id = `ticket_${i + 1}`;
    const createdAt = faker.date.recent({ days: 60, refDate });

    const comments = Array.from(
      { length: commentsPerTicket },
      (_, j): SupportTicketCommentFixture => ({
        __typename: 'SupportTicketComment',
        id: `${id}_comment_${j + 1}`,
        createdAt: new Date(createdAt.getTime() + (j + 1) * SIX_HOURS_MS).toISOString(),
        body: faker.lorem.paragraph(),
        fromSupport: j % 2 === 1,
      }),
    );

    return {
      __typename: 'SupportTicket',
      id,
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      createdAt: createdAt.toISOString(),
      updatedAt: comments.at(-1)?.createdAt ?? createdAt.toISOString(),
      subject: faker.hacker.phrase(),
      description: faker.lorem.paragraph(),
      comments: relayConnection(
        'SupportTicketCommentConnection',
        'SupportTicketCommentEdge',
        comments,
      ),
    };
  });

  return relayConnection('SupportTicketConnection', 'SupportTicketEdge', tickets);
}
