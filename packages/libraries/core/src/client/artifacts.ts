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
  endpoint: string;
  accessKey: string;
  /** client meta data */
  client?: {
    name: string;
    version: string;
  };
  circuitBreaker?: CircuitBreakerConfiguration;
  logger?: Logger;
  fetch?: typeof fetch;
};

type CDNFetcherArgs = {
  logger?: Logger;
  fetch?: typeof fetch;
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

  const circuitBreaker = new CircuitBreaker(
    function runFetch(fetchArgs?: CDNFetcherArgs) {
      const signal = circuitBreaker.getSignal();
      const logger = createHiveLogger(fetchArgs?.logger ?? args.logger ?? console, '');
      const fetchImplementation = fetchArgs?.fetch ?? args.fetch;

      const headers: {
        [key: string]: string;
      } = {
        'X-Hive-CDN-Key': args.accessKey,
        'User-Agent': `${clientInfo.name}/${clientInfo.version}`,
      };

      if (cacheETag) {
        headers['If-None-Match'] = cacheETag;
      }

      return http.get(args.endpoint, {
        headers,
        isRequestOk,
        retry: {
          retries: 10,
          maxTimeout: 200,
          minTimeout: 1,
        },
        logger,
        fetchImplementation,
        signal,
      });
    },
    {
      ...circuitBreakerConfig,
      timeout: false,
      autoRenewAbortController: true,
    },
  );

  return async function fetchArtifact(fetchArgs?: CDNFetcherArgs): Promise<CDNFetchResult> {
    try {
      const response = await circuitBreaker.fire(fetchArgs);

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
