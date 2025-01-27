import { extname } from 'node:path';
import { env } from 'node:process';
import { GraphQLError } from 'graphql';
import { InvalidDocument } from '@graphql-inspector/core';
import { CLIError } from '@oclif/core/lib/errors';
import { CompositionFailure } from '@theguild/federation-composition';
import { SchemaErrorConnection } from '../gql/graphql';
import { renderErrors } from './schema';
import { Texture } from './texture/texture';

export enum ExitCode {
  // The command execution succeeded.
  SUCCESS = 0,

  // The command execution failed with a completion code that signals an error.
  ERROR = 1,

  // The CLI was able to handle the command but it took too long and timed out.
  TIMED_OUT = 2,

  // Initialization of the CLI failed. E.g. malformed input
  BAD_INIT = 3,
}

export class HiveCLIError extends CLIError {
  constructor(
    public readonly exitCode: ExitCode,
    code: number,
    message: string,
  ) {
    const tip = `> See https://the-guild.dev/graphql/hive/docs/api-reference/cli#errors for a complete list of error codes and recommended fixes.
To disable this message set HIVE_NO_ERROR_TIP=1`;
    super(`${message}  [${code}]${env.HIVE_NO_ERROR_TIP === '1' ? '' : `\n${tip}`}`);
  }
}

/** Categorized by command */
enum ErrorCategory {
  GENERIC = 1_00,
  SCHEMA_CHECK = 2_00,
  SCHEMA_PUBLISH = 3_00,
  APP_CREATE = 4_00,
  ARTIFACT_FETCH = 5_00,
  DEV = 6_00,
  OPERATIONS_CHECK = 7_00,
}

const errorCode = (category: ErrorCategory, id: number): number => {
  return category + id;
};

export class InvalidConfigError extends HiveCLIError {
  constructor(configName = 'hive.json') {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 0),
      `The provided "${configName}" is invalid.`,
    );
  }
}

export class InvalidCommandError extends HiveCLIError {
  constructor(command: string) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 1),
      `The command, "${command}", does not exist.`,
    );
  }
}

export class MissingArgumentsError extends HiveCLIError {
  constructor(...requiredArgs: Array<[string, string]>) {
    const argsStr = requiredArgs.map(a => `${a[0].toUpperCase()} \t${a[1]}`).join('\n');
    const message = `Missing ${requiredArgs.length} required argument${requiredArgs.length > 1 ? 's' : ''}:\n${argsStr}`;
    super(ExitCode.BAD_INIT, errorCode(ErrorCategory.GENERIC, 2), message);
  }
}

export class MissingRegistryTokenError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 3),
      `A registry token is required to perform the action. For help generating an access token, see https://the-guild.dev/graphql/hive/docs/management/targets#registry-access-tokens`,
    );
  }
}

export class MissingCdnKeyError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 4),
      `A CDN key is required to perform the action. For help generating a CDN key, see https://the-guild.dev/graphql/hive/docs/management/targets#cdn-access-tokens`,
    );
  }
}

export class MissingEndpointError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 5),
      `A registry endpoint is required to perform the action.`,
    );
  }
}

export class InvalidRegistryTokenError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 6),
      `A valid registry token is required to perform the action. The registry token used does not exist or has been revoked.`,
    );
  }
}

export class InvalidCdnKeyError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 7),
      `A valid CDN key is required to perform the action. The CDN key used does not exist or has been revoked.`,
    );
  }
}

export class MissingCdnEndpointError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 8),
      `A CDN endpoint is required to perform the action.`,
    );
  }
}

export class MissingEnvironmentError extends HiveCLIError {
  constructor(...requiredVars: Array<[string, string]>) {
    const varsStr = requiredVars.map(a => `\t${a[0]} \t${a[1]}`).join('\n');
    const message = `Missing required environment variable${requiredVars.length > 1 ? 's' : ''}:\n${varsStr}`;
    super(ExitCode.BAD_INIT, errorCode(ErrorCategory.GENERIC, 9), message);
  }
}

export class SchemaFileNotFoundError extends HiveCLIError {
  constructor(fileName: string, reason?: string | Error) {
    const message = reason instanceof Error ? reason.message : reason;
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.SCHEMA_CHECK, 0),
      `Error reading the schema file "${fileName}"${message ? `: ${message}` : '.'}`,
    );
  }
}

export class SchemaFileEmptyError extends HiveCLIError {
  constructor(fileName: string) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.SCHEMA_CHECK, 1),
      `The schema file "${fileName}" is empty.`,
    );
  }
}

export class GithubCommitRequiredError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 10),
      `Couldn't resolve commit sha required for GitHub Application.`,
    );
  }
}

export class GithubRepositoryRequiredError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 11),
      `Couldn't resolve git repository required for GitHub Application.`,
    );
  }
}

export class GithubAuthorRequiredError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 12),
      `Couldn't resolve commit author required for GitHub Application.`,
    );
  }
}

export class SchemaPublishFailedError extends HiveCLIError {
  constructor() {
    super(ExitCode.ERROR, errorCode(ErrorCategory.SCHEMA_PUBLISH, 0), `Schema publish failed.`);
  }
}

export class HTTPError extends HiveCLIError {
  constructor(endpoint: string, status: number, message: string) {
    const is400 = status >= 400 && status < 500;
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 13),
      `A ${is400 ? 'client' : 'server'} error occurred while performing the action. A call to "${endpoint}" failed with Status: ${status}, Text: ${message}`,
    );
  }
}

export class NetworkError extends HiveCLIError {
  constructor(cause: Error | string) {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 14),
      `A network error occurred while performing the action: "${cause instanceof Error ? `${cause.name}: ${cause.message}` : cause}"`,
    );
  }
}

/** GraphQL Errors returned from an operation. Note that some GraphQL Errors that require specific steps to correct are handled through other error types. */
export class APIError extends HiveCLIError {
  public ref?: string;
  constructor(cause: Error | string, requestId?: string) {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 15),
      (cause instanceof Error ? `${cause.name}: ${cause.message}` : cause) +
        (requestId ? `  (Request ID: "${requestId}")` : ''),
    );
    this.ref = requestId;
  }
}

export class IntrospectionError extends HiveCLIError {
  constructor() {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 16),
      'Could not get introspection result from the service. Make sure introspection is enabled by the server.',
    );
  }
}

export class InvalidSDLError extends HiveCLIError {
  constructor(err: GraphQLError) {
    const location = err.locations?.[0];
    const locationString = location ? ` at line ${location.line}, column ${location.column}` : '';
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.SCHEMA_PUBLISH, 1),
      `The SDL is not valid${locationString}:\n ${err.message}`,
    );
  }
}

export class SchemaPublishMissingServiceError extends HiveCLIError {
  constructor(message: string) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.SCHEMA_PUBLISH, 2),
      `${message} Please use the "--service <name>" parameter.`,
    );
  }
}

export class SchemaPublishMissingUrlError extends HiveCLIError {
  constructor(message: string) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.SCHEMA_PUBLISH, 3),
      `${message} Please use the "--url <url>" parameter.`,
    );
  }
}

export class InvalidDocumentsError extends HiveCLIError {
  constructor(invalidDocuments: InvalidDocument[]) {
    const message = invalidDocuments
      .map(doc => {
        return `${Texture.failure(doc.source)}\n${doc.errors.map(e => ` - ${Texture.boldQuotedWords(e.message)}`).join('\n')}`;
      })
      .join('\n');
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.OPERATIONS_CHECK, 0),
      `Invalid operation syntax:\n${message}`,
    );
  }
}

export class ServiceAndUrlLengthMismatch extends HiveCLIError {
  constructor(services: string[], urls: string[]) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.DEV, 0),
      `Not every services has a matching url. Got ${services.length} services and ${urls.length} urls.`,
    );
  }
}

export class LocalCompositionError extends HiveCLIError {
  constructor(compositionResult: CompositionFailure) {
    const message = renderErrors({
      total: compositionResult.errors.length,
      nodes: compositionResult.errors.map(error => ({
        message: error.message,
      })),
    });
    super(ExitCode.ERROR, errorCode(ErrorCategory.DEV, 1), `Local composition failed:\n${message}`);
  }
}

export class RemoteCompositionError extends HiveCLIError {
  constructor(errors: SchemaErrorConnection) {
    const message = renderErrors(errors);
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.DEV, 2),
      `Remote composition failed:\n${message}`,
    );
  }
}

export class InvalidCompositionResultError extends HiveCLIError {
  /** Compose API spits out the error message */
  constructor(supergraph?: string | undefined | null) {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.DEV, 3),
      `Composition resulted in an invalid supergraph: ${supergraph}`,
    );
  }
}

export class PersistedOperationsMalformedError extends HiveCLIError {
  constructor(file: string) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.APP_CREATE, 0),
      `Persisted Operations file "${file}" is malformed.`,
    );
  }
}

export class UnsupportedFileExtensionError extends HiveCLIError {
  constructor(filename: string, supported?: string[]) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 17),
      `Got unsupported file extension: "${extname(filename)}".${supported ? ` Try using one of the supported extensions: ${supported.join(',')}` : ''}`,
    );
  }
}

export class FileMissingError extends HiveCLIError {
  constructor(fileName: string, additionalContext?: string) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 18),
      `Failed to load file "${fileName}"${additionalContext ? `: ${additionalContext}` : '.'}`,
    );
  }
}

export class InvalidFileContentsError extends HiveCLIError {
  constructor(fileName: string, expectedFormat: string) {
    super(
      ExitCode.BAD_INIT,
      errorCode(ErrorCategory.GENERIC, 19),
      `File "${fileName}" could not be parsed. Please make sure the file is readable and contains a valid ${expectedFormat}.`,
    );
  }
}

export class SchemaNotFoundError extends HiveCLIError {
  constructor(actionId?: string) {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.ARTIFACT_FETCH, 0),
      `No schema found${actionId ? ` for action id ${actionId}.` : '.'}`,
    );
  }
}

export class InvalidSchemaError extends HiveCLIError {
  constructor(actionId?: string) {
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.ARTIFACT_FETCH, 1),
      `Schema is invalid${actionId ? ` for action id ${actionId}.` : '.'}`,
    );
  }
}

export class UnexpectedError extends HiveCLIError {
  constructor(cause: unknown) {
    const message =
      cause instanceof Error
        ? cause.message
        : typeof cause === 'string'
          ? cause
          : JSON.stringify(cause);
    super(
      ExitCode.ERROR,
      errorCode(ErrorCategory.GENERIC, 99),
      `An unexpected error occurred: ${message}\n> Enable DEBUG=* for more details.`,
    );
  }
}

export interface AggregateError extends Error {
  errors: Error[];
}

export function isAggregateError(error: unknown): error is AggregateError {
  return !!error && typeof error === 'object' && 'errors' in error && Array.isArray(error.errors);
}
