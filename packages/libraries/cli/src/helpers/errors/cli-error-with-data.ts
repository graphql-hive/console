import { Errors } from '@oclif/core';
import { Output } from '../../output/__';
import { T } from '../typebox/__';

export class Failure extends Errors.CLIError {
  public envelope: Output.Result.FailureGeneric;
  constructor(args: {
    message: string;
    exitCode?: number;
    code?: string;
    ref?: string | undefined;
    suggestions?: string[];
    data?: Partial<Output.Result.FailureGeneric>['data'];
  }) {
    const envelope = T.Value.Default(Output.Result.FailureGeneric, {
      data: args.data,
    }) as Output.Result.FailureGeneric;

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
