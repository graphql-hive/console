import type { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue.js';
import LRU from 'tiny-lru';
import { Logger } from '@graphql-hive/logger';
import CircuitBreaker from '../circuit-breaker/circuit.js';
import { defaultCircuitBreakerConfiguration } from './circuit-breaker.js';
import { http } from './http-client.js';
import type { PersistedDocumentsConfiguration } from './types';

type HeadersObject = {
  get(name: string): string | null;
};

function isRequestOk(response: Response) {
  return response.status === 200 || response.status === 404;
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

        for (const breaker of circuitBreakers) {
          try {
            return await breaker.fire(cdnDocumentId);
          } catch (error: unknown) {
            config.logger.debug({ error });
          }
        }
        throw new Error('Failed to look up artifact.');
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
