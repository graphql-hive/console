import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue.js';
import LRU from 'tiny-lru';
import { Logger } from '@graphql-hive/logger';
import CircuitBreaker from '../circuit-breaker/circuit.js';
import { defaultCircuitBreakerConfiguration } from './circuit-breaker.js';
import { http, HttpCallConfig } from './http-client.js';
import {
  PERSISTED_DOCUMENT_NOT_FOUND,
  type PersistedDocumentsCache,
  type PersistedDocumentsConfiguration,
} from './types.js';

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
 * Error class for validation errors that will result in HTTP 400 status
 */
class PersistedDocumentValidationError extends Error {
  code: string;
  status: number;

  constructor(documentId: string, error: string) {
    super(`Invalid document ID "${documentId}": ${error}`);
    this.code = 'INVALID_DOCUMENT_ID';
    this.status = 400;
    this.name = 'PersistedDocumentValidationError';
  }
}

/**
 * Creates a validation error that will result in HTTP 400 status
 * @param documentId The invalid document ID
 * @param error The validation error
 */
function createValidationError(
  documentId: string,
  error: string,
): PersistedDocumentValidationError {
  return new PersistedDocumentValidationError(documentId, error);
}

type PersistedDocuments = {
  resolve(
    documentId: string,
    context?: { waitUntil?: (promise: Promise<void> | void) => void },
  ): PromiseOrValue<string | null>;
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
  // L1
  const persistedDocumentsCache = LRU<string | null>(config.cache ?? 10_000);

  // L2
  const layer2Cache: PersistedDocumentsCache | undefined = config.layer2Cache?.cache;
  let layer2TtlSeconds = config.layer2Cache?.ttlSeconds;
  let layer2NotFoundTtlSeconds: number | undefined = config.layer2Cache?.notFoundTtlSeconds ?? 60;
  const layer2KeyPrefix = config.layer2Cache?.keyPrefix ?? '';
  const layer2WaitUntil = config.layer2Cache?.waitUntil;

  // Validate L2 cache options
  if (layer2TtlSeconds !== undefined && layer2TtlSeconds < 0) {
    config.logger.warn(
      'Negative ttlSeconds (%d) provided for L2 cache; treating as no expiration',
      layer2TtlSeconds,
    );
    layer2TtlSeconds = undefined;
  }
  if (layer2NotFoundTtlSeconds !== undefined && layer2NotFoundTtlSeconds < 0) {
    config.logger.warn(
      'Negative notFoundTtlSeconds (%d) provided for L2 cache; treating as no expiration',
      layer2NotFoundTtlSeconds,
    );
    layer2NotFoundTtlSeconds = undefined;
  }

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

  // Attempt to get document from L2 cache, returns: { hit: true, value: string | null } or { hit: false }
  async function getFromLayer2Cache(
    documentId: string,
  ): Promise<{ hit: true; value: string | null } | { hit: false }> {
    if (!layer2Cache) {
      return { hit: false };
    }

    let cached: string | typeof PERSISTED_DOCUMENT_NOT_FOUND | null;
    try {
      cached = await layer2Cache.get(layer2KeyPrefix + documentId);
    } catch (error) {
      // L2 cache failure should not break the request
      config.logger.warn('L2 cache get failed for document %s: %O', documentId, error);
      return { hit: false };
    }

    if (cached === null) {
      // Cache miss
      return { hit: false };
    }

    if (cached === PERSISTED_DOCUMENT_NOT_FOUND) {
      // Negative cache hit, document was previously not found
      config.logger.debug('L2 cache negative hit for document %s', documentId);
      return { hit: true, value: null };
    }

    // Cache hit with document
    config.logger.debug('L2 cache hit for document %s', documentId);
    return { hit: true, value: cached };
  }

  // store document in L2 cache (fire-and-forget, non-blocking)
  function setInLayer2Cache(
    documentId: string,
    value: string | null,
    waitUntil?: (promise: Promise<void> | void) => void,
  ): void {
    if (!layer2Cache?.set) {
      return;
    }

    // Skip negative caching if TTL is 0
    if (value === null && layer2NotFoundTtlSeconds === 0) {
      return;
    }

    const cacheValue = value === null ? PERSISTED_DOCUMENT_NOT_FOUND : value;
    const ttl = value === null ? layer2NotFoundTtlSeconds : layer2TtlSeconds;

    // Fire-and-forget. don't await, don't block
    const setPromise = layer2Cache.set(layer2KeyPrefix + documentId, cacheValue, ttl ? { ttl } : undefined);
    if (setPromise) {
      const handledPromise: Promise<void> = Promise.resolve(setPromise).then(
        () => {
          config.logger.debug('L2 cache set succeeded for document %s', documentId);
        },
        error => {
          config.logger.warn('L2 cache set failed for document %s: %O', documentId, error);
        },
      );

      // Register with waitUntil for serverless environments
      // Config waitUntil takes precedence over context waitUntil
      const effectiveWaitUntil = layer2WaitUntil ?? waitUntil;
      if (effectiveWaitUntil) {
        try {
          effectiveWaitUntil(handledPromise);
        } catch (error) {
          config.logger.warn('Failed to register L2 cache write with waitUntil: %O', error);
        }
      }
    }
  }

  /** Load a persisted document with validation and L1 -> L2 -> CDN fallback */
  function loadPersistedDocument(
    documentId: string,
    context?: { waitUntil?: (promise: Promise<void> | void) => void },
  ) {
    // Validate document ID format first
    const validationError = validateDocumentId(documentId);
    if (validationError) {
      // Return a promise that will be rejected with a proper error
      return Promise.reject(createValidationError(documentId, validationError.error));
    }

    // L1 cache check (in-memory)
    // Note: We need to distinguish between "not in cache" (undefined) and "cached as not found" (null)
    const cachedDocument = persistedDocumentsCache.get(documentId);
    if (cachedDocument !== undefined) {
      // Cache hit, return the value
      return cachedDocument;
    }

    // Check in-flight requests
    let promise = fetchCache.get(documentId);
    if (promise) {
      return promise;
    }

    promise = Promise.resolve()
      .then(async (): Promise<{ value: string | null; fromL2: boolean }> => {
        // L2 cache check
        const l2Result = await getFromLayer2Cache(documentId);
        if (l2Result.hit) {
          // L2 cache hit, store in L1 for faster subsequent access
          persistedDocumentsCache.set(documentId, l2Result.value);
          return { value: l2Result.value, fromL2: true };
        }

        // CDN fetch
        const cdnDocumentId = documentId.replaceAll('~', '/');

        let lastError: unknown = null;

        for (const breaker of circuitBreakers) {
          try {
            const result = await breaker.fire(cdnDocumentId);
            return { value: result, fromL2: false };
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
      .then(({ value, fromL2 }) => {
        // Store in L1 cache (in-memory), only if not already stored from L2 hit
        if (!fromL2) {
          persistedDocumentsCache.set(documentId, value);
          // Store in L2 cache (async, non-blocking), only for CDN fetched data
          setInLayer2Cache(documentId, value, context?.waitUntil);
        }

        return value;
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
