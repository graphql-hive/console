import { T } from '../helpers/typebox/_namespace';

export type Result = Result.Failure | Result.Success;

export namespace Result {
  // --------------------------------------
  //
  // Failure
  //
  // --------------------------------------

  export const FailureBase = T.Object({
    type: T.Literal('failure', { default: 'failure' }),
    reference: T.Nullable(T.String(), { default: null }),
    suggestions: T.Array(T.String(), { default: [] }),
    warnings: T.Array(T.String(), { default: [] }),
    exitCode: T.Optional(T.Number()),
  });
  export type FailureBase = T.Static<typeof FailureBase>;

  export const Failure = T.Composite([
    FailureBase,
    T.Object({
      data: T.Record(T.String(), T.Any(), { default: {} }),
    }),
  ]);
  export type Failure = T.Static<typeof Failure>;

  export const createFailure = (init: Initify<typeof Failure>): Failure => {
    return T.Value.Default(Failure, init) as any;
  };

  export const isFailure = <$Output extends object>(
    schema: $Output,
  ): schema is Extract<$Output, { type: 'failure' }> =>
    'type' in schema && schema.type === FailureBase.properties.type.const;

  export type ExtractFailure<$Result> = $Result extends { type: 'failure' } ? $Result : never;

  // --------------------------------------
  //
  // Success
  //
  // --------------------------------------

  export const SuccessBase = T.Object({
    type: T.Literal('success', { default: 'success' }),
    warnings: T.Array(T.String(), { default: [] }),
    exitCode: T.Optional(T.Number()),
  });
  export type SuccessBase = T.Static<typeof SuccessBase>;

  export const Success = T.Composite([
    SuccessBase,
    T.Object({
      data: T.Record(T.String(), T.Any(), { default: {} }),
    }),
  ]);
  export type Success = T.Static<typeof Success>;

  export const createSuccess = (init: Initify<typeof Success>): Success => {
    return T.Value.Default(Success, init) as any;
  };

  export const isSuccess = <$Output extends object>(
    schema: $Output,
  ): schema is Extract<$Output, { type: 'success' }> =>
    'type' in schema && schema.type === SuccessBase.properties.type.const;

  export type ExtractSuccess<$Result> = $Result extends { type: 'success' } ? $Result : never;

  // --------------------------------------
  //
  // Helpers
  //
  // --------------------------------------

  export type Infer<$Schema extends T.TAnySchema> = T.Static<$Schema>;

  export type Initify<$Result> = Partial<Omit<$Result, 'type'>>;
}
