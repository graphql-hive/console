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

export function createPersistedDocuments(
  config: PersistedDocumentsConfiguration & {
    logger: Logger;
    fetch?: typeof fetch;
  },
): null | {
  resolve(documentId: string): PromiseOrValue<string | null>;
  allowArbitraryDocuments(context: { headers?: HeadersObject }): PromiseOrValue<boolean>;
} {
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

  const circuitBreaker = new CircuitBreaker(
    async function doFetch(args: { url: string; documentId: string }) {
      const signal = circuitBreaker.getSignal();

      const promise = http
        .get(args.url, {
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
          persistedDocumentsCache.set(args.documentId, text);
          return text;
        })
        .finally(() => {
          fetchCache.delete(args.url);
        });
      fetchCache.set(args.url, promise);

      return await promise;
    },
    {
      ...(config.circuitBreaker ?? defaultCircuitBreakerConfiguration),
      timeout: false,
      autoRenewAbortController: true,
    },
  );

  /** Batch load a persisted documents */
  function loadPersistedDocument(documentId: string) {
    const document = persistedDocumentsCache.get(documentId);
    if (document) {
      return document;
    }

    const cdnDocumentId = documentId.replaceAll('~', '/');

    const url = config.cdn.endpoint + '/apps/' + cdnDocumentId;
    const promise = fetchCache.get(url);
    if (promise) {
      return promise;
    }

    return circuitBreaker.fire({
      url,
      documentId,
    });
  }

  return {
    allowArbitraryDocuments,
    resolve: loadPersistedDocument,
  };
}
