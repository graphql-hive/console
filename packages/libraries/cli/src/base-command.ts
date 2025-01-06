import { print } from 'graphql';
import type { ExecutionResult } from 'graphql';
import { http } from '@graphql-hive/core';
import type { TypedDocumentNode } from '@graphql-typed-document-node/core';
import { Command, Flags, Interfaces } from '@oclif/core';
import { Config, GetConfigurationValueType, ValidConfigurationKeys } from './helpers/config';
import { Errors } from './helpers/errors/__';
import { Failure } from './helpers/errors/cli-error-with-data';
import { OmitNever } from './helpers/general';
import { Texture } from './helpers/texture/__';
import { T } from './helpers/typebox/__';
import { Output } from './output/__';

export default abstract class BaseCommand<$Command extends typeof Command> extends Command {
  public static enableJsonFlag = true;

  /**
   * The data type returned by this command when executed.
   *
   * Used by methods: {@link BaseCommand.success}, {@link BaseCommand.failure}, {@link BaseCommand.runResult}.
   */
  public static output: Output.DataType[] = [];

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
  async run(): Promise<void | Output.InferSuccess<GetOutput<$Command>>> {
    // todo: Make it easier for the Hive team to be alerted.
    // - Alert the Hive team automatically with some opt-in telemetry?
    // - A single-click-link with all relevant variables serialized into search parameters?
    const schemaViolationMessage = `Whoops. This Hive CLI command tried to output a value that violates its own schema. This should never happen. Please report this error to the Hive team at https://github.com/graphql-hive/console/issues/new.`;

    const thisClass = this.constructor as typeof BaseCommand;
    const resultUnparsed = await this.runResult();
    // @ts-expect-error fixme
    const resultDataTypeName = resultUnparsed.data.type;
    const dataType = thisClass.output.find(
      dataType => dataType.schema.properties.data.properties.type.const === resultDataTypeName,
    );
    if (!dataType) {
      throw new Failure({
        message: schemaViolationMessage,
        data: {
          type: 'ErrorDataTypeNotFound',
          message: schemaViolationMessage,
          value: resultUnparsed,
        },
      });
    }

    const errorsIterator = T.Value.Value.Errors(dataType.schema, resultUnparsed);
    const materializedErrors = T.Value.MaterializeValueErrorIterator(errorsIterator);
    if (materializedErrors.length > 0) {
      // todo: Display data in non-json output.
      // The default textual output of an OClif error will not display any of the data below. We will want that information in a bug report.
      throw new Errors.Failure({
        message: schemaViolationMessage,
        data: {
          type: 'ErrorOutputSchemaViolation',
          message: schemaViolationMessage,
          schema: dataType,
          value: resultUnparsed,
          errors: materializedErrors,
        },
      });
    }

    // Should never throw because we checked for errors above.
    const result = T.Value.Parse(dataType.schema, resultUnparsed);

    // Data types can optionally bundle a textual representation of their data.
    if (dataType.text) {
      const textureBuilder = Texture.createBuilder();
      const dataTypeTextInit = dataType.text(
        { flags: this.flags, args: this.args },
        result.data,
        textureBuilder,
      );
      const dataTypeText =
        typeof dataTypeTextInit === 'string'
          ? dataTypeTextInit
          : dataTypeTextInit === undefined
            ? // This pattern designed for user relying on mutated state of the given Tex.Builder.
              textureBuilder.state.value
            : // They returned a Tex.Builder instance.
              dataTypeTextInit.state.value;

      // `this.log` adds a newline, so remove one from text to avoid undesired extra trailing space.
      this.log(dataTypeText.replace(/\n$/, ''));
    }

    /**
     * OClif outputs returned values as JSON.
     */
    if (Output.isSuccess(result as any)) {
      return result as any;
    }

    /**
     * OClif supports converting thrown errors into JSON.
     *
     * OClif will run {@link BaseCommand.toErrorJson} which
     * allows us to convert thrown values into JSON.
     * We throw a CLIFailure which will be specially handled it.
     */
    throw new Errors.Failure({
      // @ts-expect-error fixme
      data: result.data,
      // @ts-expect-error fixme
      message: result.data.message ?? 'Unknown error.',
    });
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
    Output.InferSuccess<GetOutput<$Command>> | Output.InferFailure<GetOutput<$Command>>
  > {
    throw new Error('Not implemented');
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
      ...Output.successDefaults,
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
      ...Output.failureDefaults,
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
          throw new Errors.ClientError(
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
  async catch(error: Errors.CommandError): Promise<void> {
    if (error instanceof Errors.ClientError) {
      await super.catch(clientErrorToCLIFailure(error));
    } else {
      await super.catch(error);
    }
  }

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
  toErrorJson(value: unknown) {
    if (value instanceof Errors.Failure) {
      return value.envelope;
    }

    if (value instanceof Errors.FailedFlagValidationError) {
      return this.failureEnvelope({
        suggestions: value.suggestions,
        data: {
          type: 'FailureUserInput',
          message: value.message,
          problem: 'namedArgumentInvalid',
        },
      } as any);
    }

    if (value instanceof Errors.RequiredArgsError) {
      return this.failureEnvelope({
        suggestions: value.suggestions,
        data: {
          type: 'FailureUserInput',
          message: value.message,
          problem: 'positionalArgumentMissing',
        },
      } as any);
    }

    if (value instanceof Errors.CLIError) {
      return this.failureEnvelope({
        suggestions: value.suggestions,
        data: {
          type: 'Failure',
          message: value.message,
        },
      } as any);
    }
    if (value instanceof Error) {
      return this.failure({
        type: 'Failure',
        message: value.message,
      } as any);
    }
    return super.toErrorJson(value);
  }

  handleFetchError(error: unknown): never {
    if (typeof error === 'string') {
      this.error(error);
    }

    if (error instanceof Errors.ClientError) {
      this.error(clientErrorToCLIFailure(error));
    }

    if (error instanceof Error) {
      this.error(error);
    }

    this.error(JSON.stringify(error));
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

const clientErrorToCLIFailure = (error: Errors.ClientError): Errors.Failure => {
  const requestId = cleanRequestId(error.response?.headers?.get('x-request-id'));
  const errors =
    error.response?.errors?.map(e => {
      return {
        message: e.message,
      };
    }) ?? [];
  // todo: Use error chains & aggregate errors.
  const causedByMessage =
    errors.length > 0
      ? `Caused by error(s):\n${errors.map(e => e.message).join('\n')}`
      : `Caused by:\n${error.message}`;
  const message = `Request to Hive API failed. ${causedByMessage}`;

  return new Errors.Failure({
    message,
    ref: requestId,
    data: {
      type: 'FailureHiveApiRequest',
      message,
      requestId,
      errors,
    },
  });
};

// prettier-ignore
type InferFlags<$CommandClass extends typeof Command> =
  Interfaces.InferredFlags<(typeof BaseCommand)['baseFlags'] & $CommandClass['flags']>;

// prettier-ignore
type InferArgs<$CommandClass extends typeof Command> =
  Interfaces.InferredArgs<$CommandClass['args']>;

// prettier-ignore
type InferOutputSuccess<$CommandClass extends typeof Command> =
  Output.InferSuccess<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputFailure<$CommandClass extends typeof Command> =
  Output.InferFailure<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputFailureEnvelopeInit<$CommandClass extends typeof Command> =
  Output.InferFailureEnvelopeInit<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputSuccessEnvelopeInit<$CommandClass extends typeof Command> =
  Output.InferSuccessEnvelopeInit<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputFailureData<$CommandClass extends typeof Command> =
  Output.InferFailureData<GetOutput<$CommandClass>>;

// prettier-ignore
type InferOutputSuccessData<$CommandClass extends typeof Command> =
  Output.InferSuccessData<GetOutput<$CommandClass>>;

// prettier-ignore
type GetOutput<$CommandClass extends typeof Command> =
  'output' extends keyof $CommandClass
    ? $CommandClass['output'] extends Output.DataType[]
      ? $CommandClass['output'][number]
    : never
  : never;

const cleanRequestId = (requestId?: string | null) => {
  return requestId ? requestId.split(',')[0].trim() : undefined;
};
