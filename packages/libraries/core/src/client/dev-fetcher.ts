import { readFile } from 'node:fs/promises';
import { resolve as resolvePath } from 'node:path';
import {
  buildClientSchema,
  getIntrospectionQuery,
  parse,
  printSchema,
  type IntrospectionQuery,
} from 'graphql';
import { composeServices, compositionHasErrors } from '@theguild/federation-composition';
import type { CompositionFailure, CompositionResult } from '@theguild/federation-composition';
import CircuitBreaker from '../circuit-breaker/circuit.js';
import {
  CircuitBreakerConfiguration,
  defaultCircuitBreakerConfiguration,
} from './circuit-breaker.js';
import { http } from './http-client.js';
import type { LegacyLogger } from './types.js';
import { chooseLogger } from './utils.js';

export type FetchImplementation = typeof globalThis.fetch;

type Service = {
  name: string;
  url: string;
  sdl: string;
};

export type DevFetcherTargetReference =
  | { byId: string | number; bySelector?: never }
  | {
      byId?: never;
      bySelector: { organizationSlug: string; projectSlug: string; targetSlug: string };
    };

export type HiveDevService = {
  name: string;
  url: string;
} & (
  | {
      /** Read the schema from an SDL file rather than introspecting `url`. */
      source: 'file';
      /** Path to the service's SDL file. */
      schema: string;
    }
  | {
      /**
       * How to obtain the schema from `url`.
       * - `federation` (default): query the federation `_service { sdl }` field.
       * - `graphql`: perform standard GraphQL introspection (the `IntrospectionQuery`) and print
       *   the resulting schema.
       */
      source?: 'federation' | 'graphql';
    }
);

type CachedSupergraph = {
  services: Service[];
  supergraphSdl: string;
};

export interface HiveDevFetcherOptions {
  services: HiveDevService[];
  remote?: boolean;
  registry?: string;
  token?: string;
  target?: DevFetcherTargetReference | null;
  unstable__forceLatest?: boolean;
  /** Reported to the registry API when composing remotely. */
  version?: string;
  logger?: LegacyLogger;
  /** Custom fetch implementation used for introspecting services and calling the registry. */
  fetch?: FetchImplementation;
  /** Base directory used to resolve relative service schema file paths. Defaults to `process.cwd()`. */
  cwd?: string;
  /** Guards composition so it isn't attempted more frequently than the circuit breaker allows. */
  circuitBreaker?: CircuitBreakerConfiguration;
  /** Used to avoid recomposing the supergraph when resolved service SDLs are unchanged. */
  cache?: {
    get(key: string): Promise<CachedSupergraph | undefined> | CachedSupergraph | undefined;
    set(key: string, value: CachedSupergraph): Promise<void> | void;
  };
}

export class LocalSupergraphCompositionError extends Error {
  constructor(public compositionResult: CompositionFailure) {
    super('Local composition failed.');
  }
}

/** The registry API returned a GraphQL/API-level error while composing remotely. */
export class SupergraphRegistryApiError extends Error {}

/** Remote composition finished but produced composition errors. */
export class RemoteSupergraphCompositionError extends Error {
  constructor(public errors: Array<{ message: string }>) {
    super(`Remote composition failed:\n${errors.map(error => error.message).join('\n')}`);
  }
}

/** Remote composition reported success but did not return a usable supergraph SDL. */
export class InvalidSupergraphResultError extends Error {
  constructor(public supergraphSdl: string | null | undefined) {
    super(`Remote composition resulted in an invalid supergraph: ${supergraphSdl}`);
  }
}

export async function composeSupergraphLocally(services: Service[]): Promise<string> {
  const compositionResult = await new Promise<CompositionResult>((resolvePromise, reject) => {
    try {
      resolvePromise(
        composeServices(
          services.map(service => ({
            name: service.name,
            url: service.url,
            typeDefs: parse(service.sdl),
          })),
        ),
      );
    } catch (error) {
      // composeServices should not throw; this reject covers the offchance that
      // something unexpected happens under the hood, so the promise doesn't hang.
      reject(error);
    }
  });

  if (compositionHasErrors(compositionResult)) {
    throw new LocalSupergraphCompositionError(compositionResult);
  }

  return compositionResult.supergraphSdl;
}

export async function composeSupergraphRemotely(input: {
  services: Service[];
  registry: string;
  token: string;
  unstable__forceLatest: boolean;
  target: DevFetcherTargetReference | null;
  version: string;
  logger?: LegacyLogger;
  fetch?: FetchImplementation;
}): Promise<string> {
  const response = await http.post(
    input.registry,
    JSON.stringify({
      query: /* GraphQL */ `
        mutation CreateDevFetcher_SchemaCompose($input: SchemaComposeInput!) {
          schemaCompose(input: $input) {
            __typename
            ... on SchemaComposeSuccess {
              valid
              compositionResult {
                supergraphSdl
                errors {
                  edges {
                    node {
                      message
                    }
                  }
                }
              }
            }
            ... on SchemaComposeError {
              message
            }
          }
        }
      `,
      variables: {
        input: {
          useLatestComposableVersion: !input.unstable__forceLatest,
          services: input.services.map(service => ({
            name: service.name,
            url: service.url,
            sdl: service.sdl,
          })),
          target: input.target,
        },
      },
    }),
    {
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${input.token}`,
        'graphql-client-name': 'Hive Dev Fetcher',
        'graphql-client-version': input.version,
      },
      logger: input.logger,
      fetchImplementation: input.fetch,
    },
  );

  const body: {
    data?: {
      schemaCompose:
        | {
            __typename: 'SchemaComposeSuccess';
            valid: boolean;
            compositionResult: {
              supergraphSdl?: string | null;
              errors?: { edges: Array<{ node: { message: string } }> } | null;
            };
          }
        | { __typename: 'SchemaComposeError'; message: string };
    };
    errors?: Array<{ message: string }>;
  } = await response.json();

  if (body.errors?.length) {
    throw new SupergraphRegistryApiError(body.errors.map(error => error.message).join(', '));
  }

  const schemaCompose = body.data?.schemaCompose;
  if (!schemaCompose) {
    throw new SupergraphRegistryApiError('Received an unexpected response from the registry.');
  }

  if (schemaCompose.__typename === 'SchemaComposeError') {
    throw new SupergraphRegistryApiError(schemaCompose.message);
  }

  const { valid, compositionResult } = schemaCompose;

  if (!valid) {
    if (compositionResult.errors) {
      throw new RemoteSupergraphCompositionError(
        compositionResult.errors.edges.map(edge => edge.node),
      );
    }

    throw new InvalidSupergraphResultError(compositionResult.supergraphSdl);
  }

  if (typeof compositionResult.supergraphSdl !== 'string') {
    throw new InvalidSupergraphResultError(compositionResult.supergraphSdl);
  }

  return compositionResult.supergraphSdl;
}

async function introspectFederationService(
  service: HiveDevService,
  logger: LegacyLogger,
  fetch?: FetchImplementation,
): Promise<string> {
  const response = await http.post(service.url, JSON.stringify({ query: '{ _service { sdl } }' }), {
    headers: { 'content-type': 'application/json' },
    logger,
    fetchImplementation: fetch,
  });

  const body: {
    data?: { _service?: { sdl?: string } };
    errors?: Array<{ message: string }>;
  } = await response.json();

  if (body.errors?.length || !body.data?._service?.sdl) {
    throw new Error(
      `Could not get a federation introspection result from the service "${service.name}". ` +
        `Make sure the service exposes a federation "_service { sdl }" field, or set its ` +
        `"introspection" option to "graphql" to use standard GraphQL introspection instead.`,
    );
  }

  return body.data._service.sdl;
}

async function introspectGraphQLService(
  service: HiveDevService,
  logger: LegacyLogger,
  fetch?: FetchImplementation,
): Promise<string> {
  const response = await http.post(
    service.url,
    JSON.stringify({ query: getIntrospectionQuery() }),
    {
      headers: { 'content-type': 'application/json' },
      logger,
      fetchImplementation: fetch,
    },
  );

  const body: {
    data?: IntrospectionQuery;
    errors?: Array<{ message: string }>;
  } = await response.json();

  if (body.errors?.length || !body.data) {
    throw new Error(
      `Could not get introspection result from the service "${service.name}". Make sure introspection is enabled by the server.`,
    );
  }

  return printSchema(buildClientSchema(body.data));
}

async function resolveService(
  service: HiveDevService,
  cwd: string,
  logger: LegacyLogger,
  fetch?: FetchImplementation,
): Promise<Service> {
  if (service.source === 'file') {
    const filePath = resolvePath(cwd, service.schema);
    const contents = await readFile(filePath, 'utf8');
    // `parse` here only validates the file's contents; `contents` is kept as-is rather than
    // reprinting it, since it's re-parsed anyway by whichever composition path consumes it.
    parse(contents);
    return { name: service.name, url: service.url, sdl: contents };
  }

  const sdl =
    service.source === 'graphql'
      ? await introspectGraphQLService(service, logger, fetch)
      : await introspectFederationService(service, logger, fetch);

  return { name: service.name, url: service.url, sdl };
}

async function resolveServices(
  services: HiveDevService[],
  cwd: string,
  logger: LegacyLogger,
  fetch?: FetchImplementation,
): Promise<Service[]> {
  return Promise.all(services.map(service => resolveService(service, cwd, logger, fetch)));
}

const CACHE_KEY = 'hive:dev-fetcher:supergraph';

function servicesUnchanged(previous: Service[], next: Service[]): boolean {
  if (previous.length !== next.length) {
    return false;
  }

  return next.every(service => previous.find(p => p.name === service.name)?.sdl === service.sdl);
}

export type HiveDevFetcher = {
  /** Resolve the configured services and return the (possibly cached) composed supergraph SDL. */
  fetch(): Promise<string>;
  /** Dispose the fetcher and cleanup existing timers (e.g. used for circuit breaker) */
  dispose(): void;
};

/**
 * Create a fetcher that can get subgraph definitions from a local file, graphql introspection,
 * or federated introspection (default), and then compose these services with the latest schema
 * stored in Hive with these subgraphs replaced (based on service name).
 *
 * This is an alternative to using `@graphql-hive/cli`'s dev command.
 *
 * The composed supergraph is cached and is only recomposed if the provided service SDLs change. But
 * introspection and file reading is ran on every call, so if using Hive Gateway's polling interval,
 * set the interval accordingly. Composition is also CircuitBreaked, so that the expensive composition
 * request is guaranteed not to run too frequently.
 */
export function createDevFetcher(options: HiveDevFetcherOptions): HiveDevFetcher {
  const logger = chooseLogger(options.logger);
  const cwd = options.cwd ?? process.cwd();
  const circuitBreakerConfig = options.circuitBreaker ?? defaultCircuitBreakerConfiguration;

  const composeBreaker = new CircuitBreaker(
    async (services: Service[]) => {
      if (options.remote) {
        if (!options.registry || !options.token) {
          throw new Error('`registry` and `token` are required when `remote` is enabled.');
        }

        return await composeSupergraphRemotely({
          services,
          registry: options.registry,
          token: options.token,
          unstable__forceLatest: options.unstable__forceLatest ?? false,
          target: options.target ?? null,
          version: options.version ?? 'unknown',
          logger,
          fetch: options.fetch,
        });
      }

      return await composeSupergraphLocally(services);
    },
    {
      ...circuitBreakerConfig,
      timeout: false,
    },
  );

  return {
    async fetch(): Promise<string> {
      const services = await resolveServices(options.services, cwd, logger, options.fetch);

      const cached = await options.cache?.get(CACHE_KEY);
      if (cached && servicesUnchanged(cached.services, services)) {
        return cached.supergraphSdl;
      }

      const supergraphSdl: string = await composeBreaker.fire(services);

      await options.cache?.set(CACHE_KEY, { services, supergraphSdl });

      return supergraphSdl;
    },
    dispose() {
      composeBreaker.shutdown();
    },
  };
}
