import { gql } from 'graphql-modules';

export default gql`
  enum SchemaPolicyLevel {
    ORGANIZATION
    PROJECT
  }

  enum RuleInstanceSeverityLevel {
    OFF
    WARNING
    ERROR
  }

  type SchemaPolicy {
    id: ID!
    rules: [SchemaPolicyRuleInstance!]!
    updatedAt: DateTime!
    allowOverrides: Boolean!
  }

  type SchemaPolicyRuleInstance {
    rule: SchemaPolicyRule!
    severity: RuleInstanceSeverityLevel!
    configuration: JSON
  }

  type SchemaPolicyRule {
    id: ID!
    description: String!
    recommended: Boolean!
    configJsonSchema: JSONSchemaObject
    documentationUrl: String
  }

  extend type Query {
    schemaPolicyRules: [SchemaPolicyRule!]!
  }

  type UpdateSchemaPolicyResultError implements Error {
    message: String!
    code: String
  }

  type UpdateSchemaPolicyResultOk {
    updatedPolicy: SchemaPolicy!
    organization: Organization
    project: Project
  }

  type UpdateSchemaPolicyResult {
    ok: UpdateSchemaPolicyResultOk
    error: Error
  }

  extend type Mutation {
    updateSchemaPolicyForOrganization(
      selector: OrganizationSelectorInput!
      policy: SchemaPolicyInput!
      allowOverrides: Boolean!
    ): UpdateSchemaPolicyResult!
    updateSchemaPolicyForProject(
      selector: ProjectSelectorInput!
      policy: SchemaPolicyInput!
    ): UpdateSchemaPolicyResult!
  }

  input SchemaPolicyInput {
    rules: [SchemaPolicyRuleInstanceInput!]!
  }

  input SchemaPolicyRuleInstanceInput {
    ruleId: String!
    severity: RuleInstanceSeverityLevel!
    configuration: JSON
  }

  extend type Organization {
    schemaPolicy: SchemaPolicy
    """
    Whether the viewer can view and modify the schema policy for this organization
    """
    viewerCanModifySchemaPolicy: Boolean!
  }

  extend type Project {
    schemaPolicy: SchemaPolicy
    parentSchemaPolicy: SchemaPolicy
    """
    Whether the viewer can view and modify the schema policy for this organization
    """
    viewerCanModifySchemaPolicy: Boolean!
  }
`;
