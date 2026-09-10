import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  composeSupergraphLocally,
  composeSupergraphRemotely,
  InvalidSupergraphResultError,
  LocalSupergraphCompositionError,
  RemoteSupergraphCompositionError,
  SupergraphRegistryApiError,
  type Logger as LegacyLogger,
} from '@graphql-hive/core';
import { Flags } from '@oclif/core';
import Command from '../base-command';
import { makeFragmentData } from '../gql';
import * as GraphQLSchema from '../gql/graphql';
import { graphqlEndpoint } from '../helpers/config';
import {
  APIError,
  HiveCLIError,
  IntrospectionError,
  InvalidCompositionResultError,
  InvalidTargetError,
  LocalCompositionError,
  MissingEndpointError,
  MissingRegistryTokenError,
  RemoteCompositionError,
  ServiceAndUrlLengthMismatch,
  UnexpectedError,
} from '../helpers/errors';
import { loadSchema, RenderErrors_SchemaErrorConnectionFragment } from '../helpers/schema';
import * as TargetInput from '../helpers/target-input';
import { invariant } from '../helpers/validation';

type ServiceName = string;
type Sdl = string;

export type ServiceInput = {
  name: ServiceName;
  url: string;
  sdl?: string;
};

export type Service = {
  name: ServiceName;
  url: string;
  sdl: Sdl;
};

type ServiceWithSource = {
  name: ServiceName;
  url: string;
  sdl: Sdl;
  input:
    | {
        kind: 'file';
        path: string;
      }
    | {
        kind: 'url';
        url: string;
      };
};

export async function resolveServices(
  services: ServiceInput[],
  logger: LegacyLogger,
): Promise<Array<ServiceWithSource>> {
  return await Promise.all(
    services.map(async input => {
      if (input.sdl) {
        return {
          name: input.name,
          url: input.url,
          sdl: await resolveSdlFromPath(input.sdl, logger),
          input: {
            kind: 'file' as const,
            path: input.sdl,
          },
        };
      }

      return {
        name: input.name,
        url: input.url,
        sdl: await resolveSdlFromUrl(input.name, input.url, logger),
        input: {
          kind: 'url' as const,
          url: input.url,
        },
      };
    }),
  );
}

async function resolveSdlFromPath(path: string, logger: LegacyLogger) {
  const sdl = await loadSchema(null, path, { logger });
  invariant(typeof sdl === 'string' && sdl.length > 0, `Read empty schema from ${path}`);

  return sdl;
}

async function resolveSdlFromUrl(serviceName: string, url: string, logger: LegacyLogger) {
  const sdl = await loadSchema('only-federation-introspection', url, { logger }).catch(err => {
    logger.error(err);
    throw err;
  });

  if (!sdl) {
    throw new IntrospectionError(serviceName);
  }

  return sdl;
}

export default class Dev extends Command<typeof Dev> {
  static description = [
    'Develop and compose Supergraph with your local services.',
    'Only available for Federation projects.',
    '',
    'Two modes are available:',
    " 1. Local mode (default): Compose provided services locally. (Uses Hive's native Federation v2 composition)",
    ' 2. Remote mode: Perform composition remotely (according to project settings) using all services registered in the registry.',
  ].join('\n');
  static flags = {
    'registry.endpoint': Flags.string({
      description: 'registry endpoint',
      dependsOn: ['remote'],
    }),
    /** @deprecated */
    registry: Flags.string({
      description: 'registry address (deprecated in favor of --registry.endpoint)',
      deprecated: {
        message: 'use --registry.endpoint instead',
        version: '0.21.0',
      },
      dependsOn: ['remote'],
    }),
    'registry.accessToken': Flags.string({
      description: 'registry access token',
      dependsOn: ['remote'],
    }),
    /** @deprecated */
    token: Flags.string({
      description: 'api token (deprecated in favor of --registry.accessToken)',
      deprecated: {
        message: 'use --registry.accessToken instead',
        version: '0.21.0',
      },
      dependsOn: ['remote'],
    }),
    service: Flags.string({
      description: 'Service name',
      required: true,
      multiple: true,
      helpValue: '<string>',
    }),
    url: Flags.string({
      description: 'Service url',
      required: true,
      multiple: true,
      helpValue: '<address>',
      dependsOn: ['service'],
    }),
    schema: Flags.string({
      description: 'Service sdl. If not provided, will be introspected from the service',
      multiple: true,
      helpValue: '<filepath>',
      dependsOn: ['service'],
    }),
    watch: Flags.boolean({
      description: 'Watch mode',
      default: false,
    }),
    watchInterval: Flags.integer({
      description: 'Watch interval in milliseconds',
      default: 1000,
    }),
    write: Flags.string({
      description: 'Where to save the supergraph schema file',
      default: 'supergraph.graphql',
    }),
    remote: Flags.boolean({
      // TODO: improve description
      description: 'Compose provided services remotely',
      default: false,
    }),
    unstable__forceLatest: Flags.boolean({
      hidden: true,
      description:
        'Force the command to use the latest version of the CLI, not the latest composable version.',
      default: false,
      dependsOn: ['remote'],
    }),
    target: Flags.string({
      description:
        'The target to use for composition (slug or ID).' +
        ' This can either be a slug following the format "$organizationSlug/$projectSlug/$targetSlug" (e.g "the-guild/graphql-hive/staging")' +
        ' or an UUID (e.g. "a0f4c605-6541-4350-8cfe-b31f21a4bf80").',
    }),
  };

  async run() {
    const { flags } = await this.parse(Dev);

    const { unstable__forceLatest } = flags;

    if (flags.service.length !== flags.url.length) {
      throw new ServiceAndUrlLengthMismatch(flags.service, flags.url);
    }

    const isRemote = flags.remote === true;

    const serviceInputs = flags.service.map((name, i) => {
      const url = flags.url[i];
      const sdl = flags.schema ? flags.schema[i] : undefined;

      return {
        name,
        url,
        sdl,
      };
    });

    let target: GraphQLSchema.TargetReferenceInput | null = null;
    if (flags.target) {
      const result = TargetInput.parse(flags.target);
      if (result.type === 'error') {
        throw new InvalidTargetError();
      }
      target = result.data;
    }

    if (flags.watch === true) {
      if (isRemote) {
        let registry: string, token: string;
        try {
          registry = this.ensure({
            key: 'registry.endpoint',
            legacyFlagName: 'registry',
            args: flags,
            defaultValue: graphqlEndpoint,
            env: 'HIVE_REGISTRY',
            description: Dev.flags['registry.endpoint'].description!,
          });
        } catch (e) {
          this.logDebug(e);
          throw new MissingEndpointError();
        }
        try {
          token = this.ensure({
            key: 'registry.accessToken',
            legacyFlagName: 'token',
            args: flags,
            env: 'HIVE_TOKEN',
            description: Dev.flags['registry.accessToken'].description!,
          });
        } catch (e) {
          this.logDebug(e);
          throw new MissingRegistryTokenError();
        }

        void this.watch(flags.watchInterval, serviceInputs, services =>
          this.compose({
            services,
            registry,
            token,
            write: flags.write,
            unstable__forceLatest,
            target,
            onError: error => {
              // watch mode should not exit. Log instead.
              this.logFailure(error.message);
            },
          }),
        );

        return;
      }

      void this.watch(flags.watchInterval, serviceInputs, services =>
        this.composeLocally({
          services,
          write: flags.write,
          onError: error => {
            // watch mode should not exit. Log instead.
            this.logFailure(error.message);
          },
        }),
      );
      return;
    }

    const services = await this.resolveServices(serviceInputs);

    if (isRemote) {
      let registry: string, token: string;
      try {
        registry = this.ensure({
          key: 'registry.endpoint',
          legacyFlagName: 'registry',
          args: flags,
          defaultValue: graphqlEndpoint,
          env: 'HIVE_REGISTRY',
          description: Dev.flags['registry.endpoint'].description!,
        });
      } catch (e) {
        this.logDebug(e);
        throw new MissingEndpointError();
      }
      try {
        token = this.ensure({
          key: 'registry.accessToken',
          legacyFlagName: 'token',
          args: flags,
          env: 'HIVE_TOKEN',
          description: Dev.flags['registry.accessToken'].description!,
        });
      } catch (e) {
        this.logDebug(e);
        throw new MissingRegistryTokenError();
      }

      return this.compose({
        services,
        registry,
        token,
        write: flags.write,
        unstable__forceLatest,
        target,
        onError: error => {
          throw error;
        },
      });
    }

    return this.composeLocally({
      services,
      write: flags.write,
      onError: error => {
        throw error;
      },
    });
  }

  private async composeLocally(input: {
    services: Service[];
    write: string;
    onError: (error: HiveCLIError) => void | never;
  }) {
    let supergraphSdl: string;
    try {
      supergraphSdl = await composeSupergraphLocally(input.services);
    } catch (error) {
      if (error instanceof LocalSupergraphCompositionError) {
        input.onError(new LocalCompositionError(error.compositionResult));
        return;
      }
      throw error;
    }

    this.logSuccess('Composition successful');
    this.log(`Saving supergraph schema to ${input.write}`);
    await writeFile(resolve(process.cwd(), input.write), supergraphSdl, 'utf-8');
  }

  private async compose(input: {
    services: Service[];
    registry: string;
    token: string;
    write: string;
    unstable__forceLatest: boolean;
    target: GraphQLSchema.TargetReferenceInput | null;
    onError: (error: HiveCLIError) => void | never;
  }) {
    let supergraphSdl: string;
    try {
      supergraphSdl = await composeSupergraphRemotely({
        services: input.services,
        registry: input.registry,
        token: input.token,
        unstable__forceLatest: input.unstable__forceLatest,
        target: input.target,
        version: this.config.version,
        logger: this.logger,
      });
    } catch (error) {
      if (error instanceof SupergraphRegistryApiError) {
        input.onError(new APIError(error.message));
        return;
      }
      if (error instanceof RemoteSupergraphCompositionError) {
        input.onError(
          new RemoteCompositionError(
            makeFragmentData(
              { edges: error.errors.map(e => ({ node: { message: e.message } })) },
              RenderErrors_SchemaErrorConnectionFragment,
            ),
          ),
        );
        return;
      }
      if (error instanceof InvalidSupergraphResultError) {
        input.onError(new InvalidCompositionResultError(error.supergraphSdl));
        return;
      }
      throw error;
    }

    this.logSuccess('Composition successful');
    this.log(`Saving supergraph schema to ${input.write}`);
    try {
      await writeFile(resolve(process.cwd(), input.write), supergraphSdl, 'utf-8');
    } catch (e) {
      input.onError(new UnexpectedError(e));
    }
  }

  private async watch(
    watchInterval: number,
    serviceInputs: ServiceInput[],
    compose: (services: Service[]) => Promise<void>,
  ) {
    this.logInfo('Watch mode enabled');

    let services: ServiceWithSource[];
    try {
      services = await this.resolveServices(serviceInputs);
      await compose(services);
    } catch (e) {
      throw new UnexpectedError(e);
    }

    this.logInfo('Watching for changes');

    let resolveWatchMode: () => void;

    const watchPromise = new Promise<void>(resolve => {
      resolveWatchMode = resolve;
    });

    let timeoutId: ReturnType<typeof setTimeout>;
    const watch = async () => {
      try {
        const newServices = await this.resolveServices(serviceInputs);
        if (
          newServices.some(
            service => services.find(s => s.name === service.name)!.sdl !== service.sdl,
          )
        ) {
          this.logInfo('Detected changes, recomposing');
          await compose(newServices);
          services = newServices;
        }
      } catch (error) {
        this.logFailure(new UnexpectedError(error));
      }

      timeoutId = setTimeout(watch, watchInterval);
    };

    process.once('SIGINT', () => {
      this.logInfo('Exiting watch mode');
      clearTimeout(timeoutId);
      resolveWatchMode();
    });

    process.once('SIGTERM', () => {
      this.logInfo('Exiting watch mode');
      clearTimeout(timeoutId);
      resolveWatchMode();
    });

    void watch();

    return watchPromise;
  }

  private async resolveServices(services: ServiceInput[]): Promise<Array<ServiceWithSource>> {
    return await resolveServices(services, this.logger);
  }
}
