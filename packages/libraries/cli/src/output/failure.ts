import { OptionalizePropertyUnsafe, Simplify } from '../helpers/general';
import { T } from '../helpers/typebox/__';
import { DataType } from './output-data-type';
import type { SuccessBase } from './success';

export const FailureBase = T.Object({
  type: T.Literal('failure'),
  reference: T.Nullable(T.String()),
  suggestions: T.Array(T.String()),
  exitCode: T.Optional(T.Number()),
});
export type FailureBase = T.Static<typeof FailureBase>;

export const FailureGeneric = T.Composite([
  FailureBase,
  T.Object({
    data: T.Record(T.String(), T.Any()),
  }),
]);
export type FailureGeneric = T.Static<typeof FailureGeneric>;

export const isFailure = <$Output extends SuccessBase | FailureBase>(
  schema: $Output,
): schema is Extract<$Output, { type: 'failure' }> =>
  schema.type === FailureBase.properties.type.const;

export const failureDefaults: T.Static<typeof FailureGeneric> = {
  type: 'failure',
  reference: null,
  suggestions: [],
  data: {},
};

export type InferFailureData<$DataType extends DataType> = Simplify<
  InferFailure<$DataType>['data']
>;

export type InferFailureEnvelopeInit<$DataType extends DataType> = Simplify<
  OptionalizePropertyUnsafe<Omit<InferFailure<$DataType>, 'type'>, 'suggestions' | 'reference'>
>;

export type InferFailure<$DataType extends DataType> = Extract<
  T.Static<$DataType['schema']>,
  { type: 'failure' }
>;
