import { GraphQLError } from 'graphql';

export type CompositionErrorSource = 'graphql' | 'composition';

export interface CompositionFailureError {
  message: string;
  source: CompositionErrorSource;
}

export function toValidationError(error: any, source: CompositionErrorSource) {
  if (error instanceof GraphQLError) {
    return {
      message: error.message,
      source,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      source,
    };
  }

  return {
    message: error as string,
    source,
  };
}

export function errorWithSource(source: CompositionErrorSource) {
  return (error: unknown) => toValidationError(error, source);
}
