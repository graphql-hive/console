import { GraphQLError } from 'graphql';
import type { SchemaError } from '../__generated__/types';

export function toSchemaError(error: unknown): SchemaError {
  if (isGraphQLError(error)) {
    return {
      message: error.message,
      path: error.path?.map(i => (typeof i === 'number' ? String(i) : i)),
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: error as string,
  };
}

export function isGraphQLError(error: unknown): error is GraphQLError {
  return error instanceof GraphQLError;
}

export const HiveError = GraphQLError;

export class AccessError extends HiveError {
  constructor(reason: string, code: string = 'UNAUTHORISED', extensions?: Record<string, unknown>) {
    super(`No access (reason: "${reason}")`, {
      extensions: {
        code,
        ...extensions,
      },
    });
  }
}

export class OIDCRequiredError extends AccessError {
  constructor(
    organizationSlug: string,
    oidcIntegrationId: string,
    reason: string = 'This action requires OIDC authentication to proceed.',
  ) {
    super(reason, 'NEEDS_OIDC', { organizationSlug, oidcIntegrationId });
  }
}

/**
 * This error indicates that the user forgot to provide a target reference input
 * when using a organization access token.
 */
export class MissingTargetError extends HiveError {
  constructor(reason = 'No target was provided.', code: string = 'ERR_MISSING_TARGET') {
    super(reason, {
      extensions: {
        code,
      },
    });
  }
}
