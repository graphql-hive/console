import { Logger } from '@graphql-hive/logger';
import { version } from '../version.js';
import { http } from './http-client.js';
import type { LegacyLogger } from './types.js';
import { createHash, joinUrl } from './utils.js';

/**
 * @deprecated Please use {createCDNArtifactFetcher} instead of createSupergraphSDLFetcher.
 */
export interface SupergraphSDLFetcherOptions {
  endpoint: string;
  key: string;
  logger?: LegacyLogger | Logger;
  fetchImplementation?: typeof fetch;
  name?: string;
  version?: string;
  schemaVersionId?: string;
}

function buildSupergraphEndpoint(baseEndpoint: string, schemaVersionId?: string): string {
  // remove trailing /supergraph if present to get the base
  const base = baseEndpoint.endsWith('/supergraph')
    ? baseEndpoint.slice(0, -'/supergraph'.length)
    : baseEndpoint;

  if (schemaVersionId) {
    // versioned endpoint: /artifacts/v1/{targetId}/version/{versionId}/supergraph
    return joinUrl(joinUrl(joinUrl(base, 'version'), schemaVersionId), 'supergraph');
  }

  // latest endpoint: /artifacts/v1/{targetId}/supergraph
  return joinUrl(base, 'supergraph');
}

/**
 * @deprecated Please use {createCDNArtifactFetcher} instead.
 */
export function createSupergraphSDLFetcher(options: SupergraphSDLFetcherOptions) {
  if (options.schemaVersionId !== undefined) {
    const trimmed = options.schemaVersionId.trim();
    if (trimmed.length === 0) {
      throw new Error(
        'Invalid schemaVersionId: cannot be empty or whitespace. Provide a valid version ID or omit the option to fetch the latest version.',
      );
    }
  }

  let cacheETag: string | null = null;
  let cached: {
    id: string;
    supergraphSdl: string;
    schemaVersionId?: string;
  } | null = null;
  const endpoint = buildSupergraphEndpoint(options.endpoint, options.schemaVersionId);

  return function supergraphSDLFetcher(): Promise<{
    id: string;
    supergraphSdl: string;
    schemaVersionId?: string;
  }> {
    const headers: {
      [key: string]: string;
    } = {
      'X-Hive-CDN-Key': options.key,
      'User-Agent': `${options?.name || 'hive-client'}/${options?.version || version}`,
    };

    if (cacheETag) {
      headers['If-None-Match'] = cacheETag;
    }

    return http
      .get(endpoint, {
        headers,
        isRequestOk: response => response.status === 304 || response.ok,
        retry: {
          retries: 10,
          maxTimeout: 200,
          minTimeout: 1,
        },
        logger: options.logger,
        fetchImplementation: options.fetchImplementation,
      })
      .then(async response => {
        if (response.ok) {
          const supergraphSdl = await response.text();
          const schemaVersionId = response.headers.get('x-hive-schema-version-id');
          const result = {
            id: await createHash('SHA-256').update(supergraphSdl).digest('base64'),
            supergraphSdl,
            ...(schemaVersionId ? { schemaVersionId } : {}),
          };

          const etag = response.headers.get('etag');
          if (etag) {
            cached = result;
            cacheETag = etag;
          }

          return result;
        }

        if (response.status === 304 && cached !== null) {
          return cached;
        }

        throw new Error(
          `Failed to GET ${endpoint}, received: ${response.status} ${response.statusText ?? 'Internal Server Error'}`,
        );
      });
  };
}
