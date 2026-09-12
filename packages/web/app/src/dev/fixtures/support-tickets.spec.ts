import { SupportTicketPriority, SupportTicketStatus } from '@/gql/graphql';
import { supportTickets } from './support-tickets';

function collectTypenames(value: unknown, out: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectTypenames(item, out);
  } else if (value && typeof value === 'object') {
    out.push('__typename' in value ? String(value.__typename) : '(missing)');
    for (const child of Object.values(value)) collectTypenames(child, out);
  }
  return out;
}

describe('supportTickets', () => {
  test('builds the requested number of tickets with nested comment threads', () => {
    const connection = supportTickets({ count: 3, commentsPerTicket: 2 });

    expect(connection.__typename).toBe('SupportTicketConnection');
    expect(connection.edges).toHaveLength(3);
    expect(connection.pageInfo.hasNextPage).toBe(false);

    for (const { node } of connection.edges) {
      expect(node.comments.edges).toHaveLength(2);
      expect(node.subject.length).toBeGreaterThan(0);
      expect(node.description.length).toBeGreaterThan(0);
      expect(Date.parse(node.updatedAt)).toBeGreaterThan(Date.parse(node.createdAt));
    }
  });

  test('every object carries a __typename, which graphcache needs to normalize it', () => {
    const typenames = collectTypenames(supportTickets({ count: 2 }));

    expect(typenames).not.toContain('(missing)');
    expect(new Set(typenames)).toEqual(
      new Set([
        'SupportTicketConnection',
        'SupportTicketEdge',
        'SupportTicket',
        'SupportTicketCommentConnection',
        'SupportTicketCommentEdge',
        'SupportTicketComment',
        'PageInfo',
      ]),
    );
  });

  test('ids are unique across tickets and comments', () => {
    const connection = supportTickets({ count: 5, commentsPerTicket: 3 });
    const ids = connection.edges.flatMap(e => [
      e.node.id,
      ...e.node.comments.edges.map(c => c.node.id),
    ]);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('cycles through the given statuses and priorities', () => {
    const connection = supportTickets({
      count: 4,
      statuses: [SupportTicketStatus.Open, SupportTicketStatus.Solved],
      priorities: [SupportTicketPriority.Urgent],
    });

    expect(connection.edges.map(e => e.node.status)).toEqual([
      SupportTicketStatus.Open,
      SupportTicketStatus.Solved,
      SupportTicketStatus.Open,
      SupportTicketStatus.Solved,
    ]);
    expect(new Set(connection.edges.map(e => e.node.priority))).toEqual(
      new Set([SupportTicketPriority.Urgent]),
    );
  });

  test('alternates comment authorship between the user and support', () => {
    const [{ node }] = supportTickets({ count: 1, commentsPerTicket: 4 }).edges;

    expect(node.comments.edges.map(c => c.node.fromSupport)).toEqual([false, true, false, true]);
  });

  test('count: 0 is a well-formed empty connection, not null', () => {
    expect(supportTickets({ count: 0 })).toEqual({
      __typename: 'SupportTicketConnection',
      edges: [],
      pageInfo: {
        __typename: 'PageInfo',
        hasNextPage: false,
        hasPreviousPage: false,
        startCursor: '',
        endCursor: '',
      },
    });
  });

  test('is deterministic for the same options', () => {
    const options = {
      count: 3,
      commentsPerTicket: 2,
      seed: 7,
      now: new Date('2026-09-01T00:00:00Z'),
    };

    expect(supportTickets(options)).toEqual(supportTickets(options));
    expect(supportTickets(options)).not.toEqual(supportTickets({ ...options, seed: 8 }));
  });

  test('anchors dates on the start of the day by default, not the current millisecond', () => {
    // Two builds moments apart must match; faker would otherwise anchor on Date.now().
    expect(supportTickets({ count: 3 })).toEqual(supportTickets({ count: 3 }));
  });
});
