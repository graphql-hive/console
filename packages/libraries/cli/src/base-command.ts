import { existsSync, readFileSync } from 'node:fs';
import { env } from 'node:process';
import { Logger } from '@graphql-hive/core';
import { Command, Flags, Interfaces } from '@oclif/core';
import { Config, GetConfigurationValueType, ValidConfigurationKeys } from './helpers/config';
import {
  FileMissingError,
  InvalidFileContentsError,
  MissingArgumentsError,
} from './helpers/errors';
import { graphqlRequest } from './helpers/graphql-request';
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

  protected logger: Logger = {
    info: (...args) => this.logInfo(...args),
    error: (...args) => this.logFailure(...args),
    debug: (...args) => {
      if (this.flags.debug) {
        this.logInfo(...args);
      }
    },
  };

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
      const configValue = this._userConfig!.get(key) as GetConfigurationValueType<TKey>;

      if (configValue != null) {
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

  registryApi(registry: string, token: string) {
    const requestHeaders = {
      Authorization: `Bearer ${token}`,
      'graphql-client-name': 'Hive CLI',
      'graphql-client-version': this.config.version,
    };

    return graphqlRequest({
      endpoint: registry,
      additionalHeaders: requestHeaders,
      version: this.config.version,
      logger: this.logger,
    });
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
