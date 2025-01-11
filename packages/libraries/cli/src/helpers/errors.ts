import { GraphQLError } from 'graphql';
import * as OclifCore from '@oclif/core';
import type * as OclifInterfaces from '@oclif/core/lib/interfaces';
import * as OclifCoreParserErrors from '@oclif/core/lib/parser/errors';
import { Output } from '../output/_namespace';

/**
 * @deprecated Use {@link Errors.Messages.accessTokenMissing} instead.
 */
export const ACCESS_TOKEN_MISSING = `--registry.accessToken is required. For help generating an access token, see https://the-guild.dev/graphql/hive/docs/management/targets#registry-access-tokens`;

export namespace Errors {
  // --------------------------------------
  //
  // Messages
  //
  // --------------------------------------
  export namespace Messages {
    export const accessTokenMissing = `--registry.accessToken is required. For help generating an access token, see https://the-guild.dev/graphql/hive/docs/management/targets#registry-access-tokens`;
  }

  // --------------------------------------
  //
  // Re-exports
  //
  // --------------------------------------

  export type CommandError = OclifInterfaces.CommandError;

  export const { CLIError } = OclifCore.Errors;

  export const { RequiredArgsError, FailedFlagValidationError, ArgInvalidOptionError } =
    OclifCoreParserErrors;

  // --------------------------------------
  //
  // Failure
  //
  // --------------------------------------

  export class Failure extends OclifCore.Errors.CLIError {
    public envelope: Output.Result.Failure;
    constructor(args: {
      message: string;
      exitCode?: number;
      code?: string;
      ref?: string | undefined;
      suggestions?: string[];
      data?: Partial<Output.Result.Failure>['data'];
    }) {
      const envelope = Output.Result.createFailure({
        data: args.data,
      });

      super(args.message, {
        exit: args.exitCode,
        message: args.message,
        code: args.code,
        ref: args.ref,
        suggestions: args.suggestions,
      });
      this.envelope = envelope;
    }
  }

  // --------------------------------------
  //
  // ClientError
  //
  // --------------------------------------

  export class ClientError extends Error {
    constructor(
      message: string,
      public response: {
        errors?: readonly GraphQLError[];
        headers: Headers;
      },
    ) {
      super(message);
    }
  }
}
