import { OptionalizePropertyUnsafe, Simplify } from '../helpers/general';
import { T } from '../helpers/typebox/__';
import type { FailureBase } from './failure';
import { DataType } from './output-data-type';

export const SuccessBase = T.Object({
  type: T.Literal('success', { default: 'success' }),
  exitCode: T.Optional(T.Number()),
});
export type SuccessBase = T.Static<typeof SuccessBase>;

export const SuccessGeneric = T.Composite([
  SuccessBase,
  T.Object({
    data: T.Record(T.String(), T.Any()),
  }),
]);
export type SuccessGeneric = T.Static<typeof SuccessGeneric>;

export const successDefaults: T.Static<typeof SuccessGeneric> = {
  type: 'success',
  data: {},
};

export const isSuccess = <$Output extends FailureBase | SuccessBase>(
  schema: $Output,
): schema is Extract<$Output, { type: 'success' }> =>
  schema.type === SuccessBase.properties.type.const;

export type InferSuccessData<$DataType extends DataType> = Simplify<
  InferSuccess<$DataType>['data']
>;

export type InferSuccessEnvelopeInit<$DataType extends DataType> = Simplify<
  OptionalizePropertyUnsafe<Omit<InferSuccess<$DataType>, 'type'>, 'data'>
>;

export type InferSuccess<$DataType extends DataType> = Extract<
  T.Static<$DataType['schema']>,
  { type: 'success' }
>;
