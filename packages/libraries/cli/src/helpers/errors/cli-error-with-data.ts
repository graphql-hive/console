import { Errors } from '@oclif/core';
import { Output } from '../../output/__';

export class Failure extends Errors.CLIError {
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
