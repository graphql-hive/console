import { gql } from 'graphql-modules';

export const typeDefs = gql`
  extend type Mutation {
    exportOrganizationAuditLog(
      input: ExportOrganizationAuditLogInput!
    ): ExportOrganizationAuditLogResult!
  }

  input ExportOrganizationAuditLogInput {
    selector: OrganizationSelectorInput!
    filter: AuditLogFilter!
  }

  input AuditLogFilter {
    startDate: DateTime!
    endDate: DateTime!
  }

  type ExportOrganizationAuditLogError implements Error {
    message: String!
  }

  type ExportOrganizationAuditLogPayload {
    url: String!
  }

  type ExportOrganizationAuditLogResult {
    ok: ExportOrganizationAuditLogPayload
    error: ExportOrganizationAuditLogError
  }
`;
