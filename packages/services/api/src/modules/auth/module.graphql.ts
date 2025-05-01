import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    me: User!
  }

  extend type Mutation {
    updateMe(input: UpdateMeInput!): UpdateMeResult!
  }

  input UpdateMeInput {
    fullName: String!
    displayName: String!
  }

  type UpdateMeOk {
    updatedUser: User!
  }

  type UpdateMeInputErrors {
    fullName: String
    displayName: String
  }

  type UpdateMeError implements Error {
    message: String!
    """
    The detailed validation error messages for the input fields.
    """
    inputErrors: UpdateMeInputErrors!
  }

  """
  @oneOf
  """
  type UpdateMeResult {
    ok: UpdateMeOk
    error: UpdateMeError
  }

  type User {
    id: ID!
    email: String!
    fullName: String!
    displayName: String!
    provider: AuthProvider!
    isAdmin: Boolean!
  }

  type UserConnection {
    nodes: [User!]!
    total: Int!
  }

  enum AuthProvider {
    GOOGLE
    GITHUB
    """
    Username-Password-Authentication
    """
    USERNAME_PASSWORD
    """
    OpenID Connect
    """
    OIDC
  }

  enum OrganizationAccessScope {
    READ
    DELETE
    SETTINGS
    INTEGRATIONS
    MEMBERS
  }

  enum ProjectAccessScope {
    READ
    DELETE
    SETTINGS
    ALERTS
    OPERATIONS_STORE_READ
    OPERATIONS_STORE_WRITE
  }

  enum TargetAccessScope {
    READ
    DELETE
    SETTINGS
    REGISTRY_READ
    REGISTRY_WRITE
    TOKENS_READ
    TOKENS_WRITE
  }

  enum PermissionLevelType {
    ORGANIZATION @tag(name: "public")
    PROJECT @tag(name: "public")
    TARGET @tag(name: "public")
    SERVICE @tag(name: "public")
    APP_DEPLOYMENT @tag(name: "public")
  }

  type Permission {
    id: ID! @tag(name: "public")
    title: String! @tag(name: "public")
    description: String! @tag(name: "public")
    level: PermissionLevelType! @tag(name: "public")
    dependsOnId: ID @tag(name: "public")
    isReadOnly: Boolean!
    warning: String
  }

  type PermissionGroup {
    id: ID! @tag(name: "public")
    title: String! @tag(name: "public")
    permissions: [Permission!]! @tag(name: "public")
  }
`;
