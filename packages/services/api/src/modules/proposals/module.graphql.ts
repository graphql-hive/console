import { gql } from 'graphql-modules';

export default gql`
  extend type Mutation {
    createSchemaProposal(input: CreateSchemaProposalInput!): SchemaProposal!
    createSchemaProposalReview(input: CreateSchemaProposalReviewInput!): SchemaProposalReview!
    createSchemaProposalComment(input: CreateSchemaProposalCommentInput!): SchemaProposalComment!
  }

  input CreateSchemaProposalInput {
    diffSchemaVersionId: ID!
    title: String!

    """
    The initial changes by serviceName submitted as part of this proposal. Initial versions must have
    unique "serviceName"s.
    """
    initialVersions: [CreateSchemaProposalInitialVersionInput!]! = []

    """
    The default initial stage is OPEN. Set this to true to create this as proposal
    as a DRAFT instead.
    """
    isDraft: Boolean! = false
  }

  input CreateSchemaProposalInitialVersionInput {
    schemaSDL: String!
    serviceName: String
  }

  input CreateSchemaProposalReviewInput {
    schemaProposalVersionId: ID!
    lineNumber: Int
    """
    One or both of stageTransition or initialComment inputs is/are required.
    """
    stageTransition: SchemaProposalStage
    """
    One or both of stageTransition or initialComment inputs is/are required.
    """
    commentBody: String
  }

  input CreateSchemaProposalCommentInput {
    schemaProposalReviewId: ID!
    body: String!
  }

  extend type Query {
    schemaProposals(
      after: String
      first: Int! = 30
      input: SchemaProposalsInput
    ): SchemaProposalConnection
    schemaProposal(input: SchemaProposalInput!): SchemaProposal
    schemaProposalReviews(
      after: String
      first: Int! = 30
      input: SchemaProposalReviewsInput!
    ): SchemaProposalReviewConnection
    schemaProposalReview(input: SchemaProposalReviewInput!): SchemaProposalReview
  }

  input SchemaProposalsInput {
    target: TargetReferenceInput!
    userIds: [ID!]
    stages: [SchemaProposalStage!]
  }

  input SchemaProposalInput {
    id: ID!
  }

  input SchemaProposalReviewInput {
    id: ID!
  }

  input SchemaProposalReviewsInput {
    schemaProposalId: ID!
  }

  extend type User {
    id: ID!
  }

  extend type Target {
    id: ID!
  }

  type SchemaProposalConnection {
    edges: [SchemaProposalEdge!]
    pageInfo: PageInfo!
  }

  type SchemaProposalEdge {
    cursor: String!
    node: SchemaProposal!
  }

  extend type SchemaVersion {
    id: ID!
  }

  enum SchemaProposalStage {
    DRAFT
    OPEN
    APPROVED
    IMPLEMENTED
    CLOSED
  }

  type SchemaProposal {
    id: ID!
    createdAt: DateTime!
    diffSchema: SchemaVersion
    reviews(after: String, first: Int! = 30): SchemaProposalReviewConnection
    stage: SchemaProposalStage!
    target: Target
    title: String
    updatedAt: DateTime!
    user: User
    versions(
      after: String
      first: Int! = 15
      input: SchemaProposalVersionsInput
    ): SchemaProposalVersionConnection
    commentsCount: Int!
  }

  type SchemaProposalReviewEdge {
    cursor: String!
    node: SchemaProposalReview!
  }

  type SchemaProposalReviewConnection {
    edges: [SchemaProposalReviewEdge!]
    pageInfo: PageInfo!
  }

  type SchemaProposalVersionEdge {
    cursor: String!
    node: SchemaProposalVersion!
  }

  type SchemaProposalVersionConnection {
    edges: [SchemaProposalVersionEdge!]
    pageInfo: PageInfo!
  }

  input SchemaProposalVersionsInput {
    onlyLatest: Boolean! = false
  }

  type SchemaProposalVersion {
    id: ID!
    createdAt: DateTime!
    schemaProposal: SchemaProposal!
    schemaSDL: String!
    serviceName: String
    user: ID
    reviews(after: String, first: Int! = 30): SchemaProposalReviewConnection
  }

  type SchemaProposalCommentEdge {
    cursor: String!
    node: SchemaProposalComment!
  }

  type SchemaProposalCommentConnection {
    edges: [SchemaProposalCommentEdge!]
    pageInfo: PageInfo!
  }

  type SchemaProposalReview {
    """
    A UUID unique to this review. Used for querying.
    """
    id: ID!

    """
    Comments attached to this review.
    """
    comments(first: Int! = 200): SchemaProposalCommentConnection

    """
    When the review was first made. Only a review's comments are mutable, so there is no
    updatedAt on the review.
    """
    createdAt: DateTime!

    """
    If the "lineText" can be found in the referenced SchemaProposalVersion,
    then the "lineNumber" will be for that version. If there is no matching
    "lineText", then this "lineNumber" will reference the originally
    reviewed version of the proposal, and will be considered outdated.

    If the "lineNumber" is null then this review references the entire SchemaProposalVersion
    and not any specific line.
    """
    lineNumber: Int

    """
    If the "lineText" is null then this review references the entire SchemaProposalVersion
    and not any specific line within the proposal.
    """
    lineText: String

    """
    The specific version that this review is for.
    """
    schemaProposalVersion: SchemaProposalVersion

    """
    The parent proposal that this review is for.
    """
    schemaProposal: SchemaProposal

    """
    If null then this review is just a comment. Otherwise, the reviewer changed the state of the
    proposal as part of their review. E.g. The reviewer can approve a version with a comment.
    """
    stageTransition: SchemaProposalStage

    """
    The author of this review.
    """
    user: User
  }

  type SchemaProposalComment {
    id: ID!

    createdAt: DateTime!

    """
    Content of this comment. E.g. "Nice job!"
    """
    body: String!

    updatedAt: DateTime!

    """
    The author of this comment
    """
    user: User
  }
`;
