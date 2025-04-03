import { gql } from 'graphql-modules';

export default gql`
  extend type Organization {
    supportTickets(first: Int, after: String): SupportTicketConnection
    supportTicket(id: ID!): SupportTicket
    viewerCanManageSupportTickets: Boolean!
  }

  extend type Mutation {
    supportTicketCreate(input: SupportTicketCreateInput!): SupportTicketCreateResult!
    supportTicketReply(input: SupportTicketReplyInput!): SupportTicketReplyResult!
  }

  """
  @oneOf
  """
  type SupportTicketCreateResult {
    ok: SupportTicketCreateResultOk
    error: SupportTicketCreateResultError
  }

  type SupportTicketCreateResultOk {
    supportTicketId: ID!
  }

  type SupportTicketCreateResultError implements Error {
    message: String!
  }

  input SupportTicketCreateInput {
    organizationSlug: String!
    project: String
    target: String
    category: SupportCategory
    subject: String!
    description: String!
    priority: SupportTicketPriority!
  }

  """
  @oneOf
  """
  type SupportTicketReplyResult {
    ok: SupportTicketReplyResultOk
    error: SupportTicketReplyResultError
  }

  type SupportTicketReplyResultOk {
    supportTicketId: ID!
  }

  type SupportTicketReplyResultError implements Error {
    message: String!
  }

  input SupportTicketReplyInput {
    organizationSlug: String!
    ticketId: String!
    body: String!
  }

  type SupportTicketConnection {
    edges: [SupportTicketEdge!]!
    pageInfo: PageInfo!
  }

  type SupportTicketEdge {
    node: SupportTicket!
    cursor: String!
  }

  type SupportTicket {
    id: ID!
    status: SupportTicketStatus!
    priority: SupportTicketPriority!
    category: SupportCategory!
    project: String
    target: String
    createdAt: DateTime!
    updatedAt: DateTime!
    subject: String!
    description: String!
    comments: SupportTicketCommentConnection
  }

  type SupportTicketCommentConnection {
    edges: [SupportTicketCommentEdge!]!
    pageInfo: PageInfo!
  }

  type SupportTicketCommentEdge {
    node: SupportTicketComment!
    cursor: String!
  }

  type SupportTicketComment {
    id: ID!
    createdAt: DateTime!
    body: String!
    fromSupport: Boolean!
  }

  enum SupportCategory {
    TECHNICAL_ISSUE
    BILLING
    COMPLIANCE
    OTHER
  }

  enum SupportTicketPriority {
    NORMAL
    HIGH
    URGENT
  }

  enum SupportTicketStatus {
    OPEN
    SOLVED
  }
`;
