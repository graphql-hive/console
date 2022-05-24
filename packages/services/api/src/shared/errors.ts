import { GraphQLError } from 'graphql';
import { GraphQLYogaError } from '@graphql-yoga/common';
import type { SchemaError } from '../__generated__/types';

export function toSchemaError(error: unknown): SchemaError {
  if (isGraphQLError(error)) {
    return {
      message: error.message,
      path: error.path?.map(i => (typeof i === 'number' ? i + '' : i)),
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

export const HiveError = GraphQLYogaError;

export class AccessError extends HiveError {
  constructor(reason: string) {
    super(`No access (reason: "${reason}")`);
  }
}
