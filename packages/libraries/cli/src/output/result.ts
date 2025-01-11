import { OptionalizePropertyUnsafe, Simplify } from '../helpers/general';
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

  export const createFailure = (init: InferFailureInit<typeof Failure>): Failure => {
    return T.Value.Default(Failure, init) as any;
  };

  export const isFailure = <$Output extends object>(
    schema: $Output,
  ): schema is Extract<$Output, { type: 'failure' }> =>
    'type' in schema && schema.type === FailureBase.properties.type.const;

  export type InferFailureInit<$Schema extends T.TAnySchema> = Simplify<
    OptionalizePropertyUnsafe<
      Omit<InferFailure<$Schema>, 'type'>,
      'suggestions' | 'reference' | 'warnings' | 'data'
    >
  >;

  // todo doesn't really belong here, extract is concern of base command
  export type InferFailure<$Schema extends T.TAnySchema> = Extract<
    T.Static<$Schema>,
    { type: 'failure' }
  >;

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

  export const createSuccess = (init: InferSuccessInit<typeof Success>): Success => {
    return T.Value.Default(Success, init) as any;
  };

  export const isSuccess = <$Output extends object>(
    schema: $Output,
  ): schema is Extract<$Output, { type: 'success' }> =>
    'type' in schema && schema.type === SuccessBase.properties.type.const;

  export type InferSuccessInit<$Schema extends T.TAnySchema> = Simplify<
    OptionalizePropertyUnsafe<Omit<InferSuccess<$Schema>, 'type'>, 'data' | 'warnings'>
  >;

  // todo doesn't really belong here, extract is concern of base command
  export type InferSuccess<$Schema extends T.TAnySchema> = Extract<
    T.Static<$Schema>,
    { type: 'success' }
  >;
}
