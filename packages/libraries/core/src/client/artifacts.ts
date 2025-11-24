import CircuitBreaker from '../circuit-breaker/circuit.js';
import { version } from '../version.js';
import {
  CircuitBreakerConfiguration,
  defaultCircuitBreakerConfiguration,
} from './circuit-breaker.js';
import { http } from './http-client.js';
import type { Logger } from './types.js';
import { createHash, createHiveLogger } from './utils.js';

type CreateCDNArtifactFetcherArgs = {
  /**
   * The endpoint that should be fetched.
   *
   * It is possible to provide an endpoint list. The first endpoint will be treated as the primary source.
   * The secondary endpoint will be used in case the first endpoint fails to respond.
   *
   * Example:
   *
   * ```
   * [
   *          "https://cdn.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688/supergraph",
   *   "https://cdn-mirror.graphql-hive.com/artifacts/v1/9fb37bc4-e520-4019-843a-0c8698c25688/supergraph"
   * ]
   * ```
   */
  endpoint: string | [string, string];
  /**
   * The access key that is used for authenticating on the endpoints (via the `X-Hive-CDN-Key` header).
   */
  accessKey: string;
  logger?: Logger;
  circuitBreaker?: CircuitBreakerConfiguration;
  /**
   * Custom fetch implementation used for calling the endpoint.
   */
  fetch?: typeof fetch;
  /**
   * Optional client meta configuration.
   **/
  client?: {
    name: string;
    version: string;
  };
};

type CDNFetchResult = {
  /** Text contents of the artifact */
  contents: string;
  /** SHA-256 Hash */
  hash: string;
  /** Schema Version ID as on Hive Console (optional) */
  schemaVersionId: null | string;
};

function isRequestOk(response: Response) {
  return response.status === 304 || response.ok;
}

/**
 * Create a handler for fetching a CDN artifact with built-in cache and circuit breaker.
 * It is intended for polling supergraph, schema sdl or services.
 */
export function createCDNArtifactFetcher(args: CreateCDNArtifactFetcherArgs) {
  let cacheETag: string | null = null;
  let cached: CDNFetchResult | null = null;
  const clientInfo = args.client ?? { name: 'hive-client', version };
  const circuitBreakerConfig = args.circuitBreaker ?? defaultCircuitBreakerConfiguration;
  const logger = createHiveLogger(args.logger ?? console, '');

  const endpoints = Array.isArray(args.endpoint) ? args.endpoint : [args.endpoint];

  // TODO: we should probably do some endpoint validation
  // And print some errors if the enpoint paths do not match?
  // e.g. the only difference should be the domain name

  const circuitBreakers = endpoints.map(endpoint => {
    const circuitBreaker = new CircuitBreaker(
      function runFetch() {
        const signal = circuitBreaker.getSignal();

        const headers: {
          [key: string]: string;
        } = {
          'X-Hive-CDN-Key': args.accessKey,
          'User-Agent': `${clientInfo.name}/${clientInfo.version}`,
        };

        if (cacheETag) {
          headers['If-None-Match'] = cacheETag;
        }

        return http.get(endpoint, {
          headers,
          isRequestOk,
          retry: {
            retries: 10,
            maxTimeout: 200,
            minTimeout: 1,
          },
          logger,
          fetchImplementation: args.fetch,
          signal,
        });
      },
      {
        ...circuitBreakerConfig,
        timeout: false,
        autoRenewAbortController: true,
      },
    );
    return circuitBreaker;
  });

  return async function fetchArtifact(): Promise<CDNFetchResult> {
    // TODO: we can probably do that better...
    // If an items is half open, we would probably want to try both the opened and half opened one
    const fetcher = circuitBreakers.find(item => item.opened || item.halfOpen);

    if (!fetcher) {
      if (cached !== null) {
        return cached;
      }

      throw new Error('Failed to retrieve artifact.');
    }

    try {
      const response = await fetcher.fire();

      if (response.status === 304) {
        if (cached !== null) {
          return cached;
        }
        throw new Error('This should never happen.');
      }

      const contents = await response.text();
      const result: CDNFetchResult = {
        hash: await createHash('SHA-256').update(contents).digest('base64'),
        contents,
        schemaVersionId: response.headers.get('x-hive-schema-version-id') || null,
      };

      const etag = response.headers.get('etag');
      if (etag) {
        cached = result;
        cacheETag = etag;
      }

      return result;
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'EOPENBREAKER') {
        if (cached) {
          return cached;
        }
      }

      throw err;
    }
  };
}
