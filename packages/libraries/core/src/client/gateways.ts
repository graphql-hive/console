import { version } from '../version.js';
import { http } from './http-client.js';
import type { SchemaFetcherOptions, ServicesFetcherOptions } from './types.js';
import { chooseLogger, createHash, joinUrl } from './utils.js';

interface Schema {
  sdl: string;
  url: string | null;
  name: string;
}

function buildServicesEndpoint(baseEndpoint: string, schemaVersionId?: string): string {
  // Remove trailing /services if present to get the base
  const base = baseEndpoint.endsWith('/services')
    ? baseEndpoint.slice(0, -'/services'.length)
    : baseEndpoint;

  if (schemaVersionId) {
    // Versioned endpoint: /artifacts/v1/{targetId}/version/{versionId}/services
    return joinUrl(joinUrl(joinUrl(base, 'version'), schemaVersionId), 'services');
  }

  // Latest endpoint: /artifacts/v1/{targetId}/services
  return joinUrl(base, 'services');
}

function createFetcher(options: SchemaFetcherOptions & ServicesFetcherOptions) {
  if (options.schemaVersionId !== undefined) {
    const trimmed = options.schemaVersionId.trim();
    if (trimmed.length === 0) {
      throw new Error(
        'Invalid schemaVersionId: cannot be empty or whitespace. Provide a valid version ID or omit the option to fetch the latest version.',
      );
    }
  }

  const logger = chooseLogger(options.logger ?? console);
  let cacheETag: string | null = null;
  let cached: {
    schemas: readonly Schema[] | Schema;
    schemaVersionId: string | null;
  } | null = null;

  const endpoint = buildServicesEndpoint(options.endpoint, options.schemaVersionId);

  return function fetcher(): Promise<{
    schemas: readonly Schema[] | Schema;
    schemaVersionId: string | null;
  }> {
    const headers: {
      [key: string]: string;
    } = {
      'X-Hive-CDN-Key': options.key,
      accept: 'application/json',
      'User-Agent': `${options?.name || 'hive-client'}/${options?.version || version}`,
    };

    if (cacheETag) {
      headers['If-None-Match'] = cacheETag;
    }

    return http
      .get(endpoint, {
        headers,
        retry: {
          retries: 10,
          maxTimeout: 200,
          minTimeout: 1,
        },
        isRequestOk: response => response.ok || response.status === 304,
        logger,
      })
      .then(async response => {
        if (response.ok) {
          const result = await response.json();
          const schemaVersionId = response.headers.get('x-hive-schema-version-id');

          if (!schemaVersionId) {
            logger.info(
              `Response from ${endpoint} did not include x-hive-schema-version-id header. Version pinning will not be available.`,
            );
          }

          const data = { schemas: result, schemaVersionId };

          const etag = response.headers.get('etag');
          if (etag) {
            cached = data;
            cacheETag = etag;
          }

          return data;
        }

        if (response.status === 304 && cached !== null) {
          return cached;
        }

        throw new Error(`Unexpected error.`);
      });
  };
}

export function createSchemaFetcher(options: SchemaFetcherOptions) {
  const fetcher = createFetcher(options);

  return function schemaFetcher() {
    return fetcher().then(data => {
      const { schemas, schemaVersionId } = data;
      let service: Schema;
      // Before the new artifacts endpoint the body returned an array or a single object depending on the project type.
      // This handles both in a backwards-compatible way.
      if (schemas instanceof Array) {
        if (schemas.length !== 1) {
          throw new Error(
            'Encountered multiple services instead of a single service. Please use createServicesFetcher instead.',
          );
        }
        service = schemas[0];
      } else {
        service = schemas;
      }

      return {
        id: createSchemaId(service),
        ...service,
        ...(schemaVersionId ? { schemaVersionId } : {}),
      };
    });
  };
}

export function createServicesFetcher(options: ServicesFetcherOptions) {
  const fetcher = createFetcher(options);

  return function schemaFetcher() {
    return fetcher().then(async data => {
      const { schemas, schemaVersionId } = data;
      if (schemas instanceof Array) {
        return Promise.all(
          schemas.map(service =>
            createSchemaId(service).then(id => ({
              id,
              ...service,
              ...(schemaVersionId ? { schemaVersionId } : {}),
            })),
          ),
        );
      }
      throw new Error(
        'Encountered a single service instead of a multiple services. Please use createSchemaFetcher instead.',
      );
    });
  };
}

const createSchemaId = (service: Schema) =>
  createHash('SHA-256')
    .update(service.sdl)
    .update(service.url || '')
    .update(service.name)
    .digest('base64');
