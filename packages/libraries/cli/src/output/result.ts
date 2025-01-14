import { T } from '../helpers/typebox/_namespace';

export type Result = Result.Failure | Result.Success;

export namespace Result {
  export const Data = T.Record(T.String(), T.Any());
  export type Data = T.Static<typeof Data>;

  // --------------------------------------
  //
  // Failure
  //
  // --------------------------------------

  export const FailureBase = T.Object({
    type: T.Options(T.Literal('failure'), { default: 'failure' }),
    reference: T.Options(T.Nullable(T.String()), { default: null }),
    suggestions: T.Options(T.Array(T.String()), { default: [] }),
    warnings: T.Options(T.Array(T.String()), { default: [] }),
    exitCode: T.Options(T.Number(), { default: 1 }),
  });
  export type FailureBase = T.Static<typeof FailureBase>;

  export const Failure = T.Composite([
    FailureBase,
    T.Object({
      data: T.Options(Data, { default: {} }),
    }),
  ]);
  export type Failure = T.Static<typeof Failure>;
  export type FailureInit = T.StaticDefault<typeof Failure>;

  export const createFailure = (init: T.StaticDefault<typeof Failure>): Failure => {
    return T.Value.Default(Failure, init) as any;
  };

  export const isFailure = <$Output extends object>(
    schema: $Output,
  ): schema is Extract<$Output, { type: 'failure' }> =>
    'type' in schema && schema.type === FailureBase.properties.type.const;

  export type ExtractFailure<$Result> = Extract<$Result, { type: 'failure' }>;

  // --------------------------------------
  //
  // Success
  //
  // --------------------------------------

  export const SuccessBase = T.Object({
    type: T.Options(T.Literal('success'), { default: 'success' }),
    warnings: T.Options(T.Array(T.String()), { default: [] }),
    exitCode: T.Options(T.Number(), { default: 0 }),
  });
  export type SuccessBase = T.Static<typeof SuccessBase>;

  export const Success = T.Composite([
    SuccessBase,
    T.Object({
      data: T.Options(Data, { default: {} }),
    }),
  ]);
  export type Success = T.Static<typeof Success>;

  export const createSuccess = (init: T.StaticDefault<typeof Success>): Success => {
    return T.Value.Default(Success, init) as any;
  };

  export const isSuccess = <$Output extends object>(
    schema: $Output,
  ): schema is Extract<$Output, { type: 'success' }> =>
    'type' in schema && schema.type === SuccessBase.properties.type.const;

  export type ExtractSuccess<$Result> = Extract<$Result, { type: 'success' }>;
}
