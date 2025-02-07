import { existsSync, readFileSync } from 'node:fs';
import { env } from 'node:process';
import { print } from 'graphql';
import type { ExecutionResult } from 'graphql';
import { http } from '@graphql-hive/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Command, Flags, Interfaces } from '@oclif/core';
import { Config, GetConfigurationValueType, ValidConfigurationKeys } from './helpers/config';
import {
  APIError,
  FileMissingError,
  HTTPError,
  InvalidFileContentsError,
  InvalidRegistryTokenError,
  isAggregateError,
  MissingArgumentsError,
  NetworkError,
} from './helpers/errors';
import { Texture } from './helpers/texture/texture';

export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
  (typeof BaseCommand)['baseFlags'] & T['flags']
>;
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T['args']>;

type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export default abstract class BaseCommand<T extends typeof Command> extends Command {
  protected _userConfig: Config | undefined;

  static baseFlags = {
    debug: Flags.boolean({
      default: false,
      summary: 'Whether debug output for HTTP calls and similar should be enabled.',
    }),
  };

  protected flags!: Flags<T>;
  protected args!: Args<T>;

  protected get userConfig(): Config {
    if (!this._userConfig) {
      throw new Error('User config is not initialized');
    }
    return this._userConfig!;
  }

  public async init(): Promise<void> {
    await super.init();

    this._userConfig = new Config({
      // eslint-disable-next-line no-process-env
      filepath: process.env.HIVE_CONFIG,
      rootDir: process.cwd(),
    });

    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as Flags<T>;
    this.args = args as Args<T>;
  }

  logSuccess(...args: any[]) {
    this.log(Texture.success(...args));
  }

  logFailure(...args: any[]) {
    this.logToStderr(Texture.failure(...args));
  }

  logInfo(...args: any[]) {
    this.log(Texture.info(...args));
  }

  logWarning(...args: any[]) {
    this.log(Texture.warning(...args));
  }

  maybe<TArgs extends Record<string, any>, TKey extends keyof TArgs>({
    key,
    env,
    args,
  }: {
    key: TKey;
    env: string;
    args: TArgs;
  }) {
    if (args[key] != null) {
      return args[key];
    }

    // eslint-disable-next-line no-process-env
    if (env && process.env[env]) {
      // eslint-disable-next-line no-process-env
      return process.env[env];
    }

    return undefined;
  }

  /**
   * Get a value from arguments or flags first, then from env variables,
   * then fallback to config.
   * Throw when there's no value.
   *
   * @param key
   * @param args all arguments or flags
   * @param defaultValue default value
   * @param description description of the flag in case of no value
   * @param env an env var name
   */
  ensure<
    TKey extends ValidConfigurationKeys,
    TArgs extends {
      [key in TKey]: GetConfigurationValueType<TKey>;
    },
  >({
    key,
    args,
    legacyFlagName,
    defaultValue,
    env: envName,
    description,
  }: {
    args: TArgs;
    key: TKey;
    /** By default we try to match config names with flag names, but for legacy compatibility we need to provide the old flag name. */
    legacyFlagName?: keyof OmitNever<{
      // Symbol.asyncIterator to discriminate against any lol
      [TArgKey in keyof TArgs]: typeof Symbol.asyncIterator extends TArgs[TArgKey]
        ? never
        : string extends TArgs[TArgKey]
          ? TArgKey
          : never;
    }>;

    defaultValue?: TArgs[keyof TArgs] | null;
    description: string;
    env?: string;
  }): NonNullable<GetConfigurationValueType<TKey>> | never {
    let value: GetConfigurationValueType<TKey>;

    if (args[key] != null) {
      value = args[key];
    } else if (legacyFlagName && (args as any)[legacyFlagName] != null) {
      value = args[legacyFlagName] as NonNullable<GetConfigurationValueType<TKey>>;
    } else if (envName && env[envName] !== undefined) {
      value = env[envName] as TArgs[keyof TArgs] as NonNullable<GetConfigurationValueType<TKey>>;
    } else {
      const configValue = this._userConfig!.get(key) as NonNullable<
        GetConfigurationValueType<TKey>
      >;

      if (configValue !== undefined) {
        value = configValue;
      } else if (defaultValue) {
        value = defaultValue;
      }
    }

    if (value?.length) {
      return value;
    }

    throw new MissingArgumentsError([String(key), description]);
  }

  cleanRequestId(requestId?: string | null) {
    return requestId ? requestId.split(',')[0].trim() : undefined;
  }

  registryApi(registry: string, token: string) {
    const requestHeaders = {
      Authorization: `Bearer ${token}`,
      'graphql-client-name': 'Hive CLI',
      'graphql-client-version': this.config.version,
    };

    return this.graphql(registry, requestHeaders);
  }

  graphql(endpoint: string, additionalHeaders: Record<string, string> = {}) {
    const requestHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': `hive-cli/${this.config.version}`,
      ...additionalHeaders,
    };

    const isDebug = this.flags.debug;

    return {
      request: async <TResult, TVariables>(
        args: {
          operation: TypedDocumentNode<TResult, TVariables>;
          /** timeout in milliseconds */
          timeout?: number;
          requestId?: string;
        } & (TVariables extends Record<string, never>
          ? {
              variables?: never;
            }
          : {
              variables: TVariables;
            }),
      ): Promise<TResult> => {
        const requestId = args.requestId ?? crypto.randomUUID();
        let response: Response;
        try {
          response = await http.post(
            endpoint,
            JSON.stringify({
              query: typeof args.operation === 'string' ? args.operation : print(args.operation),
              variables: args.variables,
            }),
            {
              logger: {
                info: (...args) => {
                  if (isDebug) {
                    this.logInfo(...args);
                  }
                },
                error: (...args) => {
                  // Allow retrying requests without noise
                  if (isDebug) {
                    this.logWarning(...args);
                  }
                },
              },
              headers: {
                'x-request-id': requestId,
                ...requestHeaders,
              },
              timeout: args.timeout,
            },
          );
        } catch (e: any) {
          const sourceError = e?.cause ?? e;
          if (isAggregateError(sourceError)) {
            throw new NetworkError(sourceError.errors[0]?.message, requestId);
          } else {
            throw new NetworkError(sourceError, requestId);
          }
        }

        if (!response.ok) {
          throw new HTTPError(
            endpoint,
            response.status,
            response.statusText ?? 'Invalid status code for HTTP call',
            requestId,
          );
        }

        let jsonData;
        try {
          jsonData = (await response.json()) as ExecutionResult<TResult>;
        } catch (err) {
          const contentType = response?.headers?.get('content-type');
          throw new APIError(
            `Response from graphql was not valid JSON.${contentType ? ` Received "content-type": "${contentType}".` : ''}`,
            requestId,
          );
        }

        if (jsonData.errors && jsonData.errors.length > 0) {
          if (jsonData.errors[0].message === 'Invalid token provided') {
            throw new InvalidRegistryTokenError(requestId);
          }

          if (isDebug) {
            this.logFailure(jsonData.errors);
          }
          throw new APIError(jsonData.errors.map(e => e.message).join('\n'), requestId);
        }

        return jsonData.data!;
      },
    };
  }

  async require<
    TFlags extends {
      require: string[];
      [key: string]: any;
    },
  >(flags: TFlags) {
    if (flags.require && flags.require.length > 0) {
      await Promise.all(
        flags.require.map(mod => import(require.resolve(mod, { paths: [process.cwd()] }))),
      );
    }
  }

  readJSON(file: string): string {
    // If we can't parse it, we can try to load it from FS
    const exists = existsSync(file);

    if (!exists) {
      throw new FileMissingError(
        file,
        'Please specify a path to an existing file, or a string with valid JSON',
      );
    }

    try {
      const fileContent = readFileSync(file, 'utf-8');
      JSON.parse(fileContent);

      return fileContent;
    } catch (e) {
      throw new InvalidFileContentsError(file, 'JSON');
    }
  }
}
