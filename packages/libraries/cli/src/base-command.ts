import { print } from 'graphql';
import type { ExecutionResult } from 'graphql';
import { http } from '@graphql-hive/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Command, Flags, Interfaces } from '@oclif/core';
import { Config, GetConfigurationValueType, ValidConfigurationKeys } from './helpers/config';
import { Errors } from './helpers/errors';
import { flagNameShowOutputSchemaJson } from './helpers/flag-show-output-schema-json';
import { neverCase, OmitNever } from './helpers/general';
import { OClif } from './helpers/oclif';
import { Texture } from './helpers/texture/texture';
import { Output } from './output/_namespace';

export default abstract class BaseCommand<$Command extends typeof Command> extends Command {
  /**
   * The output types returned by this command when executed.
   *
   * Used by methods: {@link BaseCommand.successData}, {@link BaseCommand.failureData}, {@link BaseCommand.runResult}.
   */
  public static output: Output.Definition = Output.define();

  protected _userConfig: Config | undefined;

  static baseFlags = {
    debug: Flags.boolean({
      default: false,
      summary: 'Whether debug output for HTTP calls and similar should be enabled.',
    }),
  };

  protected flags!: InferFlags<$Command>;

  protected args!: InferArgs<$Command>;

  private isShowOutputSchemaJson: boolean = false;

  private outputFormat: 'text' | 'json' = 'text';

  async init(): Promise<void> {
    await super.init();

    this._userConfig = new Config({
      // eslint-disable-next-line no-process-env
      filepath: process.env.HIVE_CONFIG,
      rootDir: process.cwd(),
    });

    // Like with --help, when user wants to see the schema for JSON output
    // we don't want to parse the given arguments.
    this.isShowOutputSchemaJson = this.argv.includes(`--${flagNameShowOutputSchemaJson}`);
    if (this.isShowOutputSchemaJson) return;

    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: super.ctor.baseFlags,
      args: this.ctor.args,
      strict: this.ctor.strict,
      enableJsonFlag: this.ctor.enableJsonFlag, // todo: check this picks up subclass static prop.
    });

    this.flags = flags as InferFlags<$Command>;
    this.args = args as InferArgs<$Command>;
    this.outputFormat = this.jsonEnabled() ? 'json' : 'text';
  }

  /**
   * Prefer implementing {@link BaseCommand.runResult} instead of this method. Refer to it for its benefits.
   *
   * By default this command runs {@link BaseCommand.runResult}, having logic to handle its return value.
   */
  async run(): Promise<void | Output.Result> {
    const thisClass = this.constructor as typeof BaseCommand;

    if (this.isShowOutputSchemaJson) {
      console.log(Output.Definition.getSchemaEncoded(thisClass.output));
      return;
    }

    const resultInit = await this.runResult();
    const { result, caseDefinition } = Output.Definition.parseOrThrow(thisClass.output, resultInit);

    /**
     * Output results can specify the process exit code that should be used.
     * @see https://github.com/oclif/core/discussions/1270#discussioncomment-11750833
     */
    if (typeof result.exitCode === 'number') {
      process.exitCode = result.exitCode;
    }

    switch (this.outputFormat) {
      case 'text': {
        const text =
          Output.Case.runTextBuilder({
            caseDefinition,
            result,
            input: {
              flags: this.flags,
              args: this.args,
            },
          }) || buildDefaultText(result);

        if (text) {
          // Note: `this.log` adds a newline, so remove one from text
          // to avoid undesired extra trailing space.
          this.log(text.replace(/\n$/, ''));
        }

        result.warnings.forEach(warning => this.warn(warning));

        return;
      }
      case 'json': {
        // OClif already supports converting returned values into JSON output
        // so we have nothing to do here.
        return result;
      }
      default: {
        neverCase(this.outputFormat);
      }
    }
  }

  /**
   * @see https://oclif.io/docs/error_handling/#error-handling-in-the-catch-method
   * @see https://github.com/oclif/core/blob/main/src/command.ts#L191
   */
  // async catch(error: Errors.CommandError): Promise<void> {
  //   if (error instanceof Errors.Failure) {
  //     // todo pretty text for thrown failures.
  //     await super.catch(error);
  //   } else {
  //     await super.catch(error);
  //   }
  // }

  /**
   * Custom logic for how thrown values are converted into JSON.
   *
   * @remarks
   *
   * 1. OClif input validation error classes have
   * no structured information available about the error
   * which limits our ability here to forward structure to
   * the user. :(
   */
  toErrorJson(error: unknown) {
    if (error instanceof Errors.Failure) {
      return error.result;
    }

    if (error instanceof Errors.FailedFlagValidationError) {
      return Output.Result.createFailure({
        suggestions: error.suggestions,
        data: {
          type: 'FailureUserInput',
          message: error.message,
          problem: 'namedArgumentInvalid',
        },
      });
    }

    if (error instanceof Errors.RequiredArgsError) {
      return Output.Result.createFailure({
        suggestions: error.suggestions,
        data: {
          type: 'FailureUserInput',
          message: error.message,
          problem: 'positionalArgumentMissing',
        },
      });
    }

    if (error instanceof Error) {
      const suggestions = error instanceof Errors.CLIError ? error.suggestions : undefined;
      return Output.Result.createFailure({
        suggestions,
        data: {
          type: 'Failure',
          message: error.message,
        },
      });
    }

    return super.toErrorJson(error);
  }

  /**
   * A safer alternative to {@link BaseCommand.run}. Benefits:
   *
   * 1. Clearer control-flow: Treats errors as data (meaning you return them).
   * 2. More type-safe 1: Throwing is not tracked by TypeScript, return is.
   * 3. More type-safe 2: You are prevented from forgetting to return JSON data (void return not allowed).
   *
   * Note: You must specify your command's output type in {@link BaseCommand.output} to take advantage of this method.
   */
  async runResult(): Promise<
    | Output.Case.InferSuccessResult<GetOutputDefinition<$Command>>
    | Output.Case.InferFailureResult<GetOutputDefinition<$Command>>
  > {
    throw new Error(
      'Cannot run `runResult` method because it is not implemented. You should implement either it or `run`.',
    );
  }

  /**
   * Variant of {@link BaseCommand.success} that only requires passing the data.
   */
  successData(
    data: Output.Case.InferSuccessResult<GetOutputDefinition<$Command>>['data'],
  ): Output.Case.InferSuccessResult<GetOutputDefinition<$Command>> {
    return this.success({ data } as any) as any;
  }

  /**
   * Helper function for easy creation of success envelope (with defaults) that
   * adheres to the type specified by your command's {@link BaseCommand.output}.
   */
  success(
    init: Output.Case.InferSuccessResultInit<GetOutputDefinition<$Command>>,
  ): Output.Case.InferSuccessResult<GetOutputDefinition<$Command>> {
    return init as any;
  }

  /**
   * Variant of {@link BaseCommand.failure} that only requires passing the data.
   */
  failureData(
    data: Output.Case.InferFailureResult<GetOutputDefinition<$Command>>['data'],
  ): Output.Case.InferFailureResult<GetOutputDefinition<$Command>> {
    return this.failure({ data } as any) as any;
  }

  /**
   * Helper function for easy creation of failure data (with defaults) that
   * adheres to the type specified by your command's {@link BaseCommand.output}.
   *
   * This is only useful within {@link BaseCommand.runResult} which allows returning instead of throwing failures.
   *
   * When you return this,
   */
  failure(
    init: Output.Case.InferFailureResultInit<GetOutputDefinition<$Command>>,
  ): Output.Case.InferFailureResult<GetOutputDefinition<$Command>> {
    return init as any;
  }

  protected get userConfig(): Config {
    if (!this._userConfig) {
      throw new Error('User config is not initialized');
    }
    return this._userConfig!;
  }

  /**
   * {@link Command.log} with success styling.
   */
  logSuccess(...args: any[]) {
    this.log(Texture.success(...args).trim());
  }

  /**
   * {@link Command.log} with failure styling.
   */
  logFailure(...args: any[]) {
    this.log(Texture.failure(...args).trim());
  }

  /**
   * {@link Command.log} with info styling.
   */
  logInfo(...args: any[]) {
    this.log(Texture.info(...args).trim());
  }

  /**
   * {@link Command.log} with warning styling.
   */
  logWarning(...args: any[]) {
    this.log(Texture.warning(...args).trim());
  }

  /**
   * Get a value from arguments or flags first, then from env variables,
   * then fallback to config.
   * Throw when there's no value.
   *
   * @param key
   * @param args all arguments or flags
   * @param defaultValue default value
   * @param message custom error message in case of no value
   * @param env an env var name
   */
  ensure<
    $Key extends ValidConfigurationKeys,
    $Args extends {
      [key in $Key]: GetConfigurationValueType<$Key>;
    },
  >({
    key,
    args,
    legacyFlagName,
    defaultValue,
    message,
    env,
  }: {
    args: $Args;
    key: $Key;
    /** By default we try to match config names with flag names, but for legacy compatibility we need to provide the old flag name. */
    legacyFlagName?: keyof OmitNever<{
      // Symbol.asyncIterator to discriminate against any lol
      [TArgKey in keyof $Args]: typeof Symbol.asyncIterator extends $Args[TArgKey]
        ? never
        : string extends $Args[TArgKey]
          ? TArgKey
          : never;
    }>;

    defaultValue?: $Args[keyof $Args] | null;
    message?: string;
    env?: string;
  }): NonNullable<GetConfigurationValueType<$Key>> | never {
    if (args[key] != null) {
      return args[key] as NonNullable<GetConfigurationValueType<$Key>>;
    }

    if (legacyFlagName && (args as any)[legacyFlagName] != null) {
      return args[legacyFlagName] as any as NonNullable<GetConfigurationValueType<$Key>>;
    }

    // eslint-disable-next-line no-process-env
    if (env && process.env[env]) {
      // eslint-disable-next-line no-process-env
      return process.env[env] as $Args[keyof $Args] as NonNullable<GetConfigurationValueType<$Key>>;
    }

    const userConfigValue = this._userConfig!.get(key);

    if (userConfigValue != null) {
      return userConfigValue;
    }

    if (defaultValue) {
      return defaultValue;
    }

    if (message) {
      throw new Errors.Failure({
        message,
        data: {
          type: 'FailureUserInput',
          parameter: key,
        },
      });
    }

    throw new Errors.Failure({
      message: `Missing "${String(key)}"`,
      data: {
        type: 'FailureUserInput',
        problem: 'namedArgumentMissing',
        parameter: key,
      },
    });
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
      async request<TResult, TVariables>(
        args: {
          operation: TypedDocumentNode<TResult, TVariables>;
          /** timeout in milliseconds */
          timeout?: number;
        } & (TVariables extends Record<string, never>
          ? {
              variables?: never;
            }
          : {
              variables: TVariables;
            }),
      ): Promise<TResult> {
        const response = await http.post(
          endpoint,
          JSON.stringify({
            query: typeof args.operation === 'string' ? args.operation : print(args.operation),
            variables: args.variables,
          }),
          {
            logger: {
              info: (...args) => {
                if (isDebug) {
                  console.info(...args);
                }
              },
              error: (...args) => {
                console.error(...args);
              },
            },
            headers: requestHeaders,
            timeout: args.timeout,
          },
        );

        if (!response.ok) {
          throw new Error(`Invalid status code for HTTP call: ${response.status}`);
        }
        const jsonData = (await response.json()) as ExecutionResult<TResult>;

        if (jsonData.errors && jsonData.errors.length > 0) {
          const requestId = cleanRequestId(response?.headers?.get('x-request-id'));
          throw new Errors.Failure({
            message: `Request to Hive API failed. Caused by error(s):\n${jsonData.errors
              .map(e => e.message)
              .join('\n')}`,
            ref: requestId,
            data: {
              type: 'FailureInternalHiveApiRequest',
              errors: jsonData.errors,
              response: {
                headers: response.headers,
              },
            },
          });
        }

        return jsonData.data!;
      },
    };
  }

  handleFetchError(error: unknown): never {
    if (typeof error === 'string') {
      this.error(error);
    }

    if (error instanceof Error) {
      this.error(error);
    }

    this.error(JSON.stringify(error));
  }

  async require<$Flags extends { require?: string[] }>(flags: $Flags) {
    if (flags.require && flags.require.length > 0) {
      await Promise.all(
        flags.require.map(mod => import(require.resolve(mod, { paths: [process.cwd()] }))),
      );
    }
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
}

// prettier-ignore
type InferFlags<$CommandClass extends typeof Command> =
  Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & $CommandClass['flags']>;

// prettier-ignore
type InferArgs<$CommandClass extends typeof Command> =
  Interfaces.InferredArgs<$CommandClass['args']>;

// prettier-ignore
type GetOutputDefinition<$CommandClass extends typeof Command> =
  'output' extends keyof $CommandClass
    ? $CommandClass['output'] extends Output.Definition
      ? $CommandClass['output']['caseDefinitions'][number]
    : never
  : never;

const cleanRequestId = (requestId?: string | null) => {
  return requestId ? requestId.split(',')[0].trim() : undefined;
};

const buildDefaultText = (result: Output.Result): string => {
  switch (result.type) {
    case 'failure': {
      return OClif.prettyPrintError(
        new Errors.CLIError(result.data.message ?? 'Unknown error.', {
          suggestions: result.suggestions,
          ref: result.reference ?? undefined,
        }),
      );
    }
    case 'success': {
      return '';
    }
    default: {
      throw neverCase(result);
    }
  }
};
