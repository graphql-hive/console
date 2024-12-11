import { gql } from 'graphql-modules';

export default gql`
  extend type Query {
    lab(selector: TargetSelectorInput!): Lab
  }
  type Lab {
    schema: String!
    mocks: JSON
  }

  type PreflightScript {
    id: ID!
    sourceCode: String!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  input UpdatePreflightScriptInput {
    sourceCode: String!
  }

  extend type Mutation {
    updatePreflightScript(
      selector: TargetSelectorInput!
      input: UpdatePreflightScriptInput!
    ): PreflightScriptResult!
  }

  """
  @oneOf
  """
  type PreflightScriptResult {
    ok: PreflightScriptOk
    error: PreflightScriptError
  }

  type PreflightScriptOk {
    preflightScript: PreflightScript!
    updatedTarget: Target!
  }

  type PreflightScriptError implements Error {
    message: String!
  }

  extend type Target {
    preflightScript: PreflightScript
  }
`;
