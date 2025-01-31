import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parse } from 'graphql';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Flags } from '@oclif/core';
import {
  composeServices,
  compositionHasErrors,
  CompositionResult,
} from '@theguild/federation-composition';
import Command from '../base-command';
import { graphql } from '../gql';
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
import { loadSchema } from '../helpers/schema';
import * as TargetSlug from '../helpers/target-slug';
import { invariant } from '../helpers/validation';

const CLI_SchemaComposeMutation = graphql(/* GraphQL */ `
  mutation CLI_SchemaComposeMutation($input: SchemaComposeInput!) {
    schemaCompose(input: $input) {
      __typename
      ... on SchemaComposeSuccess {
        valid
        compositionResult {
          supergraphSdl
          errors {
            total
            nodes {
              message
            }
          }
        }
      }
      ... on SchemaComposeError {
        message
      }
    }
  }
`);

const ServiceIntrospectionQuery = /* GraphQL */ `
  query ServiceSdlQuery {
    _service {
      sdl
    }
  }
` as unknown as TypedDocumentNode<
  {
    __typename?: 'Query';
    _service: { sdl: string };
  },
  {
    [key: string]: never;
  }
>;

type ServiceName = string;
type Sdl = string;

type ServiceInput = {
  name: ServiceName;
  url: string;
  sdl?: string;
};

type Service = {
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

export default class Dev extends Command<typeof Dev> {
  static description = [
    'Develop and compose Supergraph with your local services.',
    'Only available for Federation projects.',
    '',
    'Two modes are available:',
    " 1. Local mode (default): Compose provided services locally. (Uses Hive's native Federation v2 composition)",
    ' 2. Remote mode: Perform composition remotely (according to project settings) using all services registered in the registry.',
    '',
    'Work in Progress: Please note that this command is still under development and may undergo changes in future releases',
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
      description: 'The target to use for composition.',
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

    let target: GraphQLSchema.TargetSelectorInput | null = null;
    if (flags.target) {
      const result = TargetSlug.parse(flags.target);
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
    services: Array<{
      name: string;
      url: string;
      sdl: string;
    }>;
    write: string;
    onError: (error: HiveCLIError) => void | never;
  }) {
    const compositionResult = await new Promise<CompositionResult>((resolve, reject) => {
      try {
        resolve(
          composeServices(
            input.services.map(service => ({
              name: service.name,
              url: service.url,
              typeDefs: parse(service.sdl),
            })),
          ),
        );
      } catch (error) {
        // @note: composeServices should not throw.
        // This reject is for the offchance that something happens under the hood that was not expected.
        // Without it, if something happened then the promise would hang.
        reject(error);
      }
    });

    if (compositionHasErrors(compositionResult)) {
      input.onError(new LocalCompositionError(compositionResult));
      return;
    }

    this.logSuccess('Composition successful');
    this.log(`Saving supergraph schema to ${input.write}`);
    await writeFile(resolve(process.cwd(), input.write), compositionResult.supergraphSdl, 'utf-8');
  }

  private async compose(input: {
    services: Array<{
      name: string;
      url: string;
      sdl: string;
    }>;
    registry: string;
    token: string;
    write: string;
    unstable__forceLatest: boolean;
    target: GraphQLSchema.TargetSelectorInput | null;
    onError: (error: HiveCLIError) => void | never;
  }) {
    const result = await this.registryApi(input.registry, input.token).request({
      operation: CLI_SchemaComposeMutation,
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
    });

    if (result.schemaCompose.__typename === 'SchemaComposeError') {
      input.onError(new APIError(result.schemaCompose.message));
      return;
    }

    const { valid, compositionResult } = result.schemaCompose;

    if (!valid) {
      // @note: Can this actually be invalid without any errors?
      if (compositionResult.errors) {
        input.onError(new RemoteCompositionError(compositionResult.errors));
        return;
      }

      input.onError(new InvalidCompositionResultError(compositionResult.supergraphSdl));
      return;
    }

    if (typeof compositionResult.supergraphSdl !== 'string') {
      input.onError(new InvalidCompositionResultError(compositionResult.supergraphSdl));
      return;
    }

    this.logSuccess('Composition successful');
    this.log(`Saving supergraph schema to ${input.write}`);
    try {
      await writeFile(
        resolve(process.cwd(), input.write),
        compositionResult.supergraphSdl,
        'utf-8',
      );
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
    return await Promise.all(
      services.map(async input => {
        if (input.sdl) {
          return {
            name: input.name,
            url: input.url,
            sdl: await this.resolveSdlFromPath(input.sdl),
            input: {
              kind: 'file' as const,
              path: input.sdl,
            },
          };
        }

        return {
          name: input.name,
          url: input.url,
          sdl: await this.resolveSdlFromUrl(input.url),
          input: {
            kind: 'url' as const,
            url: input.url,
          },
        };
      }),
    );
  }

  private async resolveSdlFromPath(path: string) {
    const sdl = await loadSchema(path);
    invariant(typeof sdl === 'string' && sdl.length > 0, `Read empty schema from ${path}`);

    return sdl;
  }

  private async resolveSdlFromUrl(url: string) {
    const result = await this.graphql(url).request({ operation: ServiceIntrospectionQuery });

    const sdl = result._service.sdl;

    if (!sdl) {
      throw new IntrospectionError();
    }

    return sdl;
  }
}
