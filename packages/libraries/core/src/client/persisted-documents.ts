import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue.js';
import LRU from 'tiny-lru';
import { Logger } from '@graphql-hive/logger';
import CircuitBreaker from '../circuit-breaker/circuit.js';
import { defaultCircuitBreakerConfiguration } from './circuit-breaker.js';
import { http, HttpCallConfig } from './http-client.js';
import type { PersistedDocumentsConfiguration } from './types';

type HeadersObject = {
  get(name: string): string | null;
};

function isRequestOk(response: Response) {
  return response.status === 200 || response.status === 404;
}

/**
 * Validates the format of a persisted document ID.
 * Expected format: "name~version~hash" (e.g., "client-name~client-version~hash")
 * @param documentId The document ID to validate
 * @returns Validation result with error message if invalid, null if valid
 */
function validateDocumentId(documentId: string): { error: string } | null {
  if (!documentId || typeof documentId !== 'string') {
    return {
      error: 'Expected format: "name~version~hash" (e.g., "client-name~client-version~hash")',
    };
  }

  const parts = documentId.split('~');
  if (parts.length !== 3) {
    return {
      error: 'Expected format: "name~version~hash" (e.g., "client-name~client-version~hash")',
    };
  }

  const [name, version, hash] = parts;

  // Validate each part
  if (!name || name.trim() === '') {
    return {
      error: 'Name cannot be empty. Expected format: "name~version~hash"',
    };
  }

  if (!version || version.trim() === '') {
    return {
      error: 'Version cannot be empty. Expected format: "name~version~hash"',
    };
  }

  if (!hash || hash.trim() === '') {
    return {
      error:
        'Hash cannot be empty. Expected format: "name~version~hash" (e.g., "client-name~client-version~hash")',
    };
  }

  return null;
}

/**
 * Creates a validation error that will result in HTTP 400 status
 * @param documentId The invalid document ID
 * @param error The validation error
 */
function createValidationError(documentId: string, error: string): Error {
  const validationError = new Error(`Invalid document ID "${documentId}": ${error}`);
  (validationError as any).code = 'INVALID_DOCUMENT_ID';
  (validationError as any).status = 400;
  return validationError;
}

type PersistedDocuments = {
  resolve(documentId: string): PromiseOrValue<string | null>;
  allowArbitraryDocuments(context: { headers?: HeadersObject }): PromiseOrValue<boolean>;
  dispose: () => void;
};

export function createPersistedDocuments(
  config: PersistedDocumentsConfiguration & {
    logger: Logger;
    fetch?: typeof fetch;
    retry?: HttpCallConfig['retry'];
    timeout?: HttpCallConfig['retry'];
  },
): PersistedDocuments {
  const persistedDocumentsCache = LRU<string>(config.cache ?? 10_000);

  let allowArbitraryDocuments: (context: { headers?: HeadersObject }) => PromiseOrValue<boolean>;

  if (typeof config.allowArbitraryDocuments === 'boolean') {
    let value = config.allowArbitraryDocuments;
    allowArbitraryDocuments = () => value;
  } else if (typeof config.allowArbitraryDocuments === 'function') {
    allowArbitraryDocuments = config.allowArbitraryDocuments;
  } else {
    allowArbitraryDocuments = () => false;
  }

  /** if there is already a in-flight request for a document, we re-use it. */
  const fetchCache = new Map<string, Promise<string | null>>();

  const endpoints = Array.isArray(config.cdn.endpoint)
    ? config.cdn.endpoint
    : [config.cdn.endpoint];

  const circuitBreakers = endpoints.map(endpoint => {
    const circuitBreaker = new CircuitBreaker(
      async function doFetch(cdnDocumentId: string) {
        const signal = circuitBreaker.getSignal();

        return await http
          .get(endpoint + '/apps/' + cdnDocumentId, {
            headers: {
              'X-Hive-CDN-Key': config.cdn.accessToken,
            },
            logger: config.logger,
            isRequestOk,
            fetchImplementation: config.fetch,
            signal,
            retry: config.retry,
          })
          .then(async response => {
            if (response.status !== 200) {
              return null;
            }
            const text = await response.text();
            return text;
          });
      },
      {
        ...(config.circuitBreaker ?? defaultCircuitBreakerConfiguration),
        timeout: false,
        autoRenewAbortController: true,
      },
    );

    return circuitBreaker;
  });

  /** Batch load a persisted documents */
  function loadPersistedDocument(documentId: string) {
    const validationError = validateDocumentId(documentId);
    if (validationError) {
      // Return a promise that will be rejected with a proper error
      return Promise.reject(createValidationError(documentId, validationError.error));
    }

    const document = persistedDocumentsCache.get(documentId);
    if (document) {
      return document;
    }

    let promise = fetchCache.get(documentId);
    if (promise) {
      return promise;
    }

    promise = Promise.resolve()
      .then(async () => {
        const cdnDocumentId = documentId.replaceAll('~', '/');

        let lastError: unknown = null;

        for (const breaker of circuitBreakers) {
          try {
            return await breaker.fire(cdnDocumentId);
          } catch (error: unknown) {
            config.logger.debug({ error });
            lastError = error;
          }
        }
        if (lastError) {
          config.logger.error({ error: lastError });
        }
        throw new Error('Failed to look up persisted operation.');
      })
      .then(result => {
        persistedDocumentsCache.set(documentId, result);
        return result;
      })
      .finally(() => {
        fetchCache.delete(documentId);
      });

    fetchCache.set(documentId, promise);

    return promise;
  }

  return {
    allowArbitraryDocuments,
    resolve: loadPersistedDocument,
    dispose() {
      circuitBreakers.map(breaker => breaker.shutdown());
    },
  };
}
