import { gql } from 'graphql-modules';

export default gql`
  extend type Mutation {
    """
    Create a CDN access token for a target.
    """
    createCdnAccessToken(input: CreateCdnAccessTokenInput!): CdnAccessTokenCreateResult!
      @tag(name: "public")
    """
    Delete a CDN access token.
    """
    deleteCdnAccessToken(input: DeleteCdnAccessTokenInput!): DeleteCdnAccessTokenResult!
      @tag(name: "public")
  }

  extend type Query {
    """
    Whether the CDN integration in Hive is enabled.
    """
    isCDNEnabled: Boolean!
  }

  extend type Target {
    """
    The URL for accessing this target's artifacts via the CDN.
    """
    cdnUrl: String!
    """
    A paginated connection of CDN tokens for accessing this target's artifacts.
    """
    cdnAccessTokens(
      first: Int @tag(name: "public")
      after: String @tag(name: "public")
    ): TargetCdnAccessTokenConnection! @tag(name: "public")
  }

  extend type Contract {
    """
    The URL for accessing this contracts's artifacts via the CDN.
    """
    cdnUrl: String!
  }

  type CdnAccessToken {
    id: ID! @tag(name: "public")
    alias: String! @tag(name: "public")
    firstCharacters: String! @tag(name: "public")
    lastCharacters: String! @tag(name: "public")
    createdAt: DateTime! @tag(name: "public")
  }

  type TargetCdnAccessTokenConnection {
    edges: [TargetCdnAccessTokenEdge!]! @tag(name: "public")
    pageInfo: PageInfo! @tag(name: "public")
  }

  type TargetCdnAccessTokenEdge {
    node: CdnAccessToken! @tag(name: "public")
    cursor: String! @tag(name: "public")
  }

  input DeleteCdnAccessTokenInput {
    target: TargetReferenceInput! @tag(name: "public")
    cdnAccessTokenId: ID! @tag(name: "public")
  }

  """
  @oneOf
  """
  type DeleteCdnAccessTokenResult {
    ok: DeleteCdnAccessTokenResultOk @tag(name: "public")
    error: DeleteCdnAccessTokenResultError @tag(name: "public")
  }

  type DeleteCdnAccessTokenResultOk {
    deletedCdnAccessTokenId: ID! @tag(name: "public")
  }

  type DeleteCdnAccessTokenResultError {
    message: String! @tag(name: "public")
  }

  input CreateCdnAccessTokenInput {
    """
    The target for which the access token should be created for.
    """
    target: TargetReferenceInput! @tag(name: "public")
    """
    Alias describing the purpose of the access token.
    """
    alias: String! @tag(name: "public")
  }

  """
  @oneOf
  """
  type CdnAccessTokenCreateResult {
    ok: CdnAccessTokenCreateResultOk @tag(name: "public")
    error: CdnAccessTokenCreateResultError @tag(name: "public")
  }

  type CdnAccessTokenCreateResultOk {
    createdCdnAccessToken: CdnAccessToken! @tag(name: "public")
    secretAccessToken: String! @tag(name: "public")
    cdnUrl: String! @tag(name: "public")
  }

  type CdnAccessTokenCreateResultError {
    message: String! @tag(name: "public")
  }
`;
