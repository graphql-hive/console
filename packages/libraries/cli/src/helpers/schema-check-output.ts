import { SeverityLevelType } from '../gql/graphql';

type ChangeNode = {
  severityLevel: SeverityLevelType;
  isSafeBasedOnUsage: boolean;
  message: string;
  approval?: { approvedBy?: { displayName: string } | null } | null;
  affectedAppDeployments?: { totalCount: number } | null;
};

/**
 * The result of `hive schema:check --output=json`.
 * This is a public contract that scripts rely on, so only add fields to it.
 */
export type SchemaCheckJsonOutput = {
  /** Whether the schema check passed. */
  valid: boolean;
  /** `true` if the target had no schema to compare against. `null` for GitHub App checks. */
  initial: boolean | null;
  /** The stored schema check. `null` if the registry did not store the check. */
  schemaCheck: { id: string; webUrl: string | null } | null;
  /** The message of the GitHub App check. `null` otherwise. */
  message: string | null;
  changes: Array<{
    message: string;
    severity: SeverityLevelType;
    isSafeBasedOnUsage: boolean;
    approvedBy: string | null;
    affectedAppDeployments: number;
  }>;
  warnings: Array<{
    message: string;
    source: string | null;
    line: number | null;
    column: number | null;
  }>;
  errors: Array<{ message: string }>;
};

type SchemaCheckPayloadInput = {
  valid: boolean;
  initial?: boolean;
  message?: string;
  schemaCheck?: { id: string; webUrl?: string | null } | null;
  changes?: { edges: Array<{ node: ChangeNode }> } | null;
  warnings?: {
    nodes: Array<{
      message: string;
      source?: string | null;
      line?: number | null;
      column?: number | null;
    }>;
  } | null;
  errors?: { edges: Array<{ node: { message: string } }> } | null;
};

export function createSchemaCheckJsonOutput(
  payload: SchemaCheckPayloadInput,
): SchemaCheckJsonOutput {
  return {
    valid: payload.valid,
    initial: payload.initial ?? null,
    schemaCheck: payload.schemaCheck
      ? { id: payload.schemaCheck.id, webUrl: payload.schemaCheck.webUrl ?? null }
      : null,
    message: payload.message ?? null,
    changes: (payload.changes?.edges ?? []).map(({ node }) => ({
      message: node.message,
      severity: node.severityLevel,
      isSafeBasedOnUsage: node.isSafeBasedOnUsage,
      approvedBy: node.approval ? (node.approval.approvedBy?.displayName ?? null) : null,
      affectedAppDeployments: node.affectedAppDeployments?.totalCount ?? 0,
    })),
    warnings: (payload.warnings?.nodes ?? []).map(warning => ({
      message: warning.message,
      source: warning.source ?? null,
      line: warning.line ?? null,
      column: warning.column ?? null,
    })),
    errors: (payload.errors?.edges ?? []).map(({ node }) => ({ message: node.message })),
  };
}
