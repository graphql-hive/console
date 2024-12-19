import colors from 'colors';
import { print } from 'graphql';
import type { ExecutionResult } from 'graphql';
import { http } from '@graphql-hive/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Command, Errors, Flags, Interfaces } from '@oclif/core';
import { CommandError } from '@oclif/core/lib/interfaces';
import { Record } from '@sinclair/typebox';
import { Config, GetConfigurationValueType, ValidConfigurationKeys } from './helpers/config';
import { CLIFailure } from './helpers/errors/cli-failure';
import { ClientError } from './helpers/errors/client-error';
import { OmitNever } from './helpers/general';
import { tb } from './helpers/typebox/__';
// todo raise issue with respective ESLint lib author about type imports used in JSDoc being marked as "unused"
// eslint-disable-next-line
import type { Infer } from './library/infer';
import { SchemaOutput } from './schema-output/__';

export default abstract class BaseCommand<$Command extends typeof Command> extends Command {
  public static enableJsonFlag = true;

  /**
   * The path to this command as it is executed in your CLI for the purposes of
   * library inference. See {@link Infer} for more information.
   *
   * By default the execution path is inferred by snake-casing your command class name
   * and then replacing underscores with colons.
   *
   * @see https://oclif.io/docs/topics
   */
  public static executionPath?: string;

  /**
   * A *description fragment* of the action that this command performs.
   * Formulate your words such that it can be appended to e.g. "Failed to ${descriptionFragmentForAction}".
   * Used in certain automated error messages.
   */
  public static descriptionFragmentForAction = 'perform action';

  /**
   * The data type returned by this command when executed.
   *
   * Used by methods: {@link BaseCommand.success}, {@link BaseCommand.failure}, {@link BaseCommand.runResult}.
   */
  public static output: SchemaOutput.OutputBaseT = SchemaOutput.OutputBase;

  protected _userConfig: Config | undefined;

  static baseFlags = {
    debug: Flags.boolean({
      default: false,
      summary: 'Whether debug output for HTTP calls and similar should be enabled.',
    }),
  };

  protected flags!: InferFlags<$Command>;

  protected args!: InferArgs<$Command>;

  /**
   * Prefer implementing {@link BaseCommand.runResult} instead of this method. Refer to it for its benefits.
   *
   * By default this command runs {@link BaseCommand.runResult}, having logic to handle its return value.
   */
  async run(): Promise<void | SchemaOutput.InferSuccess<GetOutput<$Command>>> {
    const resultUnparsed = await this.runResult();
    const schema = (this.constructor as typeof BaseCommand).output as SchemaOutput.OutputBaseT;

    const errorsIterator = tb.Value.Value.Errors(schema, resultUnparsed);
    const materializedErrors = tb.Value.MaterializeValueErrorIterator(errorsIterator);
    if (materializedErrors.length > 0) {
      console.dir(materializedErrors, { depth: 100 });
      // todo: Make it easier for the Hive team to be alerted.
      // - Alert the Hive team automatically with some opt-in telemetry?
      // - A single-click-link with all relevant variables serialized into search parameters?
      const message = `Whoops. This Hive CLI command tried to output a value that violates its own schema. This should never happen. Please report this issue to the Hive team at https://github.com/graphql-hive/console/issues/new.`;
      // todo: Display data in non-json output.
      // The default textual output of an OClif error will not display any of the data below. We will want that information in a bug report.
      throw new CLIFailure({
        message: message,
        data: {
          __typename: 'CLIOutputTypeError',
          schema: schema,
          value: resultUnparsed,
          errors: materializedErrors,
        },
      });
    }

    // Should never throw because we checked for errors above.
    const result = tb.Value.Parse(schema, resultUnparsed);

    /**
     * OClif outputs returned values as JSON.
     */
    if (SchemaOutput.isSuccess(result)) {
      return result as any;
    }

    /**
     * OClif supports converting thrown errors into JSON.
     *
     * OClif will run {@link BaseCommand.toErrorJson} which
     * allows us to convert thrown values into JSON.
     * We throw a CLIFailure which will be specially handled it.
     */
    throw new CLIFailure(result);
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
    SchemaOutput.InferSuccess<GetOutput<$Command>> | SchemaOutput.InferFailure<GetOutput<$Command>>
  > {
    throw new Error('Not implemented');
  }

  /**
   * Custom logic for how thrown values are converted into JSON.
   *
   * Any time a CLIFailure is thrown its public
   * envelope property is used as the JSON output
   * when JSON is enabled.
   */
  toErrorJson(value: unknown) {
    if (value instanceof CLIFailure) {
      return value.envelope;
    }
    return super.toErrorJson(value);
  }

  /**
   * Variant of {@link BaseCommand.successEnvelope} that only requires passing the data.
   * See that method for more details.
   */
  success(data: InferOutputSuccessData<$Command>): InferOutputSuccess<$Command> {
    return this.successEnvelope({ data } as any) as any;
  }

  /**
   * Helper function for easy creation of success envelope (with defaults) that
   * adheres to the type specified by your command's {@link BaseCommand.output}.
   */
  successEnvelope(
    envelopeInit: InferOutputSuccessEnvelopeInit<$Command>,
  ): InferOutputSuccess<$Command> {
    return {
      ...SchemaOutput.successDefaults,
      ...(envelopeInit as object),
    } as any;
  }

  /**
   * Variant of {@link BaseCommand.failure} that only requires passing the data.
   * See that method for more details.
   */
  failure(data: InferOutputFailureData<$Command>): InferOutputFailure<$Command> {
    return this.failureEnvelope({ data } as any) as any;
  }

  /**
   * Helper function for easy creation of failure data (with defaults) that
   * adheres to the type specified by your command's {@link BaseCommand.output}.
   *
   * This is only useful within {@link BaseCommand.runResult} which allows returning instead of throwing failures.
   *
   * When you return this,
   */
  failureEnvelope(
    envelopeInit: InferOutputFailureEnvelopeInit<$Command>,
  ): InferOutputFailure<$Command> {
    return {
      ...SchemaOutput.failureDefaults,
      ...(envelopeInit as object),
    } as any;
  }

  protected get userConfig(): Config {
    if (!this._userConfig) {
      throw new Error('User config is not initialized');
    }
    return this._userConfig!;
  }

  async init(): Promise<void> {
    await super.init();

    this._userConfig = new Config({
      // eslint-disable-next-line no-process-env
      filepath: process.env.HIVE_CONFIG,
      rootDir: process.cwd(),
    });

    const { args, flags } = await this.parse({
      flags: this.ctor.flags,
      baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
      enableJsonFlag: this.ctor.enableJsonFlag,
      args: this.ctor.args,
      strict: this.ctor.strict,
    });
    this.flags = flags as InferFlags<$Command>;
    this.args = args as InferArgs<$Command>;
  }

  /**
   * {@link Command.log} with success styling.
   */
  logSuccess(...args: any[]) {
    this.log(colors.green('✔'), ...args);
  }

  /**
   * {@link Command.log} with failure styling.
   */
  logFailure(...args: any[]) {
    this.log(colors.red('✖'), ...args);
  }

  /**
   * {@link Command.log} with info styling.
   */
  logInfo(...args: any[]) {
    this.log(colors.yellow('ℹ'), ...args);
  }

  /**
   * {@link Command.log} with warning styling.
   */
  logWarning(...args: any[]) {
    this.log(colors.yellow('⚠'), ...args);
  }

  bolderize(msg: string) {
    const findSingleQuotes = /'([^']+)'/gim;
    const findDoubleQuotes = /"([^"]+)"/gim;

    return msg
      .replace(findSingleQuotes, (_: string, value: string) => colors.bold(value))
      .replace(findDoubleQuotes, (_: string, value: string) => colors.bold(value));
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
   * @param message custom error message in case of no value
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
    message,
    env,
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
    message?: string;
    env?: string;
  }): NonNullable<GetConfigurationValueType<TKey>> | never {
    if (args[key] != null) {
      return args[key] as NonNullable<GetConfigurationValueType<TKey>>;
    }

    if (legacyFlagName && (args as any)[legacyFlagName] != null) {
      return args[legacyFlagName] as any as NonNullable<GetConfigurationValueType<TKey>>;
    }

    // eslint-disable-next-line no-process-env
    if (env && process.env[env]) {
      // eslint-disable-next-line no-process-env
      return process.env[env] as TArgs[keyof TArgs] as NonNullable<GetConfigurationValueType<TKey>>;
    }

    const userConfigValue = this._userConfig!.get(key);

    if (userConfigValue != null) {
      return userConfigValue;
    }

    if (defaultValue) {
      return defaultValue;
    }

    if (message) {
      throw new Errors.CLIError(message);
    }

    throw new Errors.CLIError(`Missing "${String(key)}"`);
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
          throw new ClientError(
            `Failed to execute GraphQL operation: ${jsonData.errors
              .map(e => e.message)
              .join('\n')}`,
            {
              errors: jsonData.errors,
              headers: response.headers,
            },
          );
        }

        return jsonData.data!;
      },
    };
  }

  /**
   * @see https://oclif.io/docs/error_handling/#error-handling-in-the-catch-method
   */
  async catch(error: CommandError): Promise<void> {
    if (error instanceof Errors.CLIError) {
      await super.catch(error);
    } else {
      const descriptionFragmentForAction = (this.constructor as typeof BaseCommand)
        .descriptionFragmentForAction;
      this.logFailure(`Failed to ${descriptionFragmentForAction}`);
      this.handleFetchError(error);
    }
  }

  handleFetchError(error: unknown): never {
    if (typeof error === 'string') {
      return this.error(error);
    }

    if (error instanceof Error) {
      if (error instanceof ClientError) {
        const errors = error.response?.errors;

        if (Array.isArray(errors) && errors.length > 0) {
          return this.error(errors[0].message, {
            ref: this.cleanRequestId(error.response?.headers?.get('x-request-id')),
          });
        }

        return this.error(error.message, {
          ref: this.cleanRequestId(error.response?.headers?.get('x-request-id')),
        });
      }

      return this.error(error);
    }

    return this.error(JSON.stringify(error));
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
}

// prettier-ignore
type InferFlags<$CommandClass extends typeof Command> =
  Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & $CommandClass['flags']>;

// prettier-ignore
type InferArgs<$CommandClass extends typeof Command> =
  Interfaces.InferredArgs<$CommandClass['args']>;

// prettier-ignore
type InferOutputSuccess<$CommandClass extends typeof Command> =
  SchemaOutput.InferSuccess<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputFailure<$CommandClass extends typeof Command> =
  SchemaOutput.InferFailure<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputFailureEnvelopeInit<$CommandClass extends typeof Command> =
  SchemaOutput.InferFailureEnvelopeInit<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputSuccessEnvelopeInit<$CommandClass extends typeof Command> =
  SchemaOutput.InferSuccessEnvelopeInit<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputFailureData<$CommandClass extends typeof Command> =
  SchemaOutput.InferFailureData<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputSuccessData<$CommandClass extends typeof Command> =
  SchemaOutput.InferSuccessData<GetOutput<$CommandClass>>;

// prettier-ignore
type GetOutput<$CommandClass extends typeof Command> =
  'output' extends keyof $CommandClass
    ? $CommandClass['output'] extends SchemaOutput.OutputBaseT
      ? $CommandClass['output']
    : never
  : never;
