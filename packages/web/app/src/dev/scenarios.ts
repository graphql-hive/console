import type { IMockStore } from '@graphql-tools/mock';
import { supportTickets } from './fixtures/support-tickets';

type Resolver = (parent: any, args: any) => unknown;
export type ResolverMap = Record<string, Record<string, Resolver>>;

export type Scenario = {
  name: string;
  description: string;
  seed?: number;
  /** Value for every Boolean field named viewerCan*. Default true. */
  viewerCan?: boolean;
  /** Constants keyed by "Type.field"; null is allowed for nullable fields. Applied last. */
  fields?: Record<`${string}.${string}`, unknown>;
  /** Resolver overrides, typically returning fixtures. Win over the generated ones. */
  resolvers?: (ctx: { store: IMockStore }) => ResolverMap;
  /** false skips planting the session cookies, so the auth pages render. Default true. */
  session?: boolean;
};

export const DEFAULT_SCENARIO = 'default';

const emptyConnection = () => ({
  edges: [],
  pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: '', endCursor: '' },
});

export const scenarios: Record<string, Scenario> = {
  default: {
    name: 'default',
    description: 'PRO plan, every gate open, realistic data',
  },

  'support-with-tickets': {
    name: 'support-with-tickets',
    description: 'Support page with open and solved tickets and comment threads',
    resolvers: () => {
      const tickets = supportTickets({ count: 8, commentsPerTicket: 3 });
      return {
        Organization: {
          supportTickets: () => tickets,
          supportTicket: (_parent, args) =>
            tickets.edges.find(e => e.node.id === args.id)?.node ?? null,
        },
      };
    },
  },

  'empty-org': {
    name: 'empty-org',
    description: 'Fresh organization: no projects, schemas, operations or tickets',
    fields: {
      'Query.hasCollectedOperations': false,
      'Target.hasSchema': false,
      'Target.latestSchemaVersion': null,
      'Target.latestValidSchemaVersion': null,
      'OrganizationGetStarted.creatingProject': false,
      'OrganizationGetStarted.publishingSchema': false,
      'OrganizationGetStarted.checkingSchema': false,
      'OrganizationGetStarted.invitingMembers': false,
      'OrganizationGetStarted.reportingOperations': false,
      'OrganizationGetStarted.enablingUsageBasedBreakingChanges': false,
    },
    resolvers: () => ({
      Organization: {
        projects: emptyConnection,
        supportTickets: () => supportTickets({ count: 0 }),
      },
    }),
  },

  'over-quota': {
    name: 'over-quota',
    description: 'Monthly operations limit exceeded and a failing payment method',
    fields: {
      'Organization.isMonthlyOperationsLimitExceeded': true,
      'BillingConfiguration.hasPaymentIssues': true,
      'RateLimit.limitedForOperations': true,
    },
  },

  'read-only-member': {
    name: 'read-only-member',
    description: 'A member with no permissions: every viewerCan* is false',
    viewerCan: false,
    fields: {
      'User.isAdmin': false,
      'Member.isOwner': false,
    },
  },

  'logged-out': {
    name: 'logged-out',
    description: 'No session, so the sign-in, sign-up and reset pages render',
    session: false,
  },
};
