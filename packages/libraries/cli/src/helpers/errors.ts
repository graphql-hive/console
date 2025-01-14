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
    public result: Output.Result.Failure;
    constructor(parameters: {
      message: string;
      exitCode?: number;
      code?: string;
      ref?: string | undefined;
      suggestions?: string[];
      data?: Output.Result.Failure['data'];
    }) {
      super(parameters.message, {
        // exit: args.exitCode,
        // message: args.message,
        code: parameters.code,
        ref: parameters.ref,
        suggestions: parameters.suggestions,
      });
      this.result = Output.Result.createFailure({
        data: parameters.data,
      });
    }
  }
}
