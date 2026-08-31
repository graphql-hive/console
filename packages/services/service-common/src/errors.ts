import type { FastifyBaseLogger, FastifyInstance } from 'fastify';
import * as Sentry from '@sentry/node';

export type ErrorSource = string;

const errorSourceProperty = 'hiveErrorSource';

export type ErrorWithSource = Error & {
  errorSource: ErrorSource;
};

const unexpectedErrorCounted = Symbol('unexpectedErrorCounted');

export function markUnexpectedErrorCounted(error: unknown): void {
  if (error instanceof Error) {
    Object.defineProperty(error, unexpectedErrorCounted, { value: true });
  }
}

export function isUnexpectedErrorCounted(error: unknown): boolean {
  return error instanceof Error && unexpectedErrorCounted in error;
}

export function withErrorSource<T>(promise: Promise<T>, errorSource: ErrorSource): Promise<T> {
  return promise.catch(error => {
    throw setErrorSource(error, errorSource);
  });
}

export function setErrorSource(error: unknown, errorSource: ErrorSource): ErrorWithSource {
  const sourcedError = error instanceof Error ? error : new Error(String(error));

  if (!('errorSource' in sourcedError)) {
    Object.defineProperty(sourcedError, errorSourceProperty, {
      value: errorSource,
      enumerable: true,
    });
  }

  return sourcedError as ErrorWithSource;
}

export function getErrorSource(error: unknown): ErrorSource | null {
  if (error instanceof Error && errorSourceProperty in error) {
    return String(error[errorSourceProperty]);
  }

  return null;
}

export function createErrorHandler(server: FastifyInstance) {
  return function errorHandler(message: string, error: Error, logger?: FastifyBaseLogger) {
    Sentry.captureException(error);
    if (logger) {
      logger.error(`${message} (error=%s)`, error);
    } else {
      server.log.error(`${message} (error=%s)`, error);
    }
  };
}
