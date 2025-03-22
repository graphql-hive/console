// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Errors {
  export abstract class ContextualError<
    $Name extends string = string,
    $Context extends object = object,
    $Cause extends Error | undefined = Error | undefined,
  > extends Error {
    public name: $Name;
    public context: $Context;
    public cause: $Cause;
    constructor(
      ...args: undefined extends $Cause
        ? [context: $Context, cause?: $Cause]
        : [context: $Context, cause: $Cause]
    ) {
      const [context, cause] = args;
      super('Something went wrong.', { cause });
      this.name = this.constructor.name as $Name;
      this.context = context;
      this.cause = cause as $Cause;
    }
  }

  export class TypedAggregateError<$Error extends Error> extends AggregateError {
    constructor(
      public errors: $Error[],
      message?: string,
    ) {
      super(errors, message);
      this.name = this.constructor.name;
    }
  }
}
