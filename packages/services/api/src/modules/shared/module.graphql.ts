import { gql } from 'graphql-modules';

export default gql`
  scalar DateTime @tag(name: "public")
  scalar Date
  scalar JSON
  scalar JSONSchemaObject
  scalar SafeInt

  extend schema
    @link(url: "https://specs.apollo.dev/link/v1.0")
    @link(url: "https://specs.apollo.dev/federation/v2.0", import: ["@tag"])

  directive @link(url: String!, import: [String!]) repeatable on SCHEMA

  directive @tag(
    name: String!
  ) repeatable on FIELD_DEFINITION | INTERFACE | OBJECT | UNION | ARGUMENT_DEFINITION | SCALAR | ENUM | ENUM_VALUE | INPUT_OBJECT | INPUT_FIELD_DEFINITION | SCHEMA

  type Query {
    _: Boolean @tag(name: "public")
  }

  type Mutation {
    _: Boolean @tag(name: "public")
  }

  type PageInfo {
    hasNextPage: Boolean! @tag(name: "public")
    hasPreviousPage: Boolean! @tag(name: "public")
    startCursor: String! @tag(name: "public")
    endCursor: String! @tag(name: "public")
  }
`;
