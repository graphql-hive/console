import { OptionalizePropertyUnsafe, Simplify } from '../helpers/general';
import { T } from '../helpers/typebox/__';
import { Definition } from './definition';
import type { SuccessBase } from './success';

export const FailureBase = T.Object({
  type: T.Literal('failure', { default: 'failure' }),
  reference: T.Nullable(T.String(), { default: null }),
  suggestions: T.Array(T.String(), { default: [] }),
  warnings: T.Array(T.String(), { default: [] }),
  exitCode: T.Optional(T.Number()),
});
export type FailureBase = T.Static<typeof FailureBase>;

export const FailureGeneric = T.Composite([
  FailureBase,
  T.Object({
    data: T.Record(T.String(), T.Any(), { default: {} }),
  }),
]);
export type FailureGeneric = T.Static<typeof FailureGeneric>;

export const isFailure = <$Output extends SuccessBase | FailureBase>(
  schema: $Output,
): schema is Extract<$Output, { type: 'failure' }> =>
  schema.type === FailureBase.properties.type.const;

export type InferFailureInit<$DataType extends Definition> = Simplify<
  OptionalizePropertyUnsafe<
    Omit<InferFailure<$DataType>, 'type'>,
    'suggestions' | 'reference' | 'warnings'
  >
>;

export type InferFailure<$DataType extends Definition> = Extract<
  T.Static<$DataType['schema']>,
  { type: 'failure' }
>;
