import { OptionalizePropertyUnsafe, Simplify } from '../helpers/general';
import { T } from '../helpers/typebox/__';
import { Definition } from './definition';
import type { FailureBase } from './failure';

export const SuccessBase = T.Object({
  type: T.Literal('success', { default: 'success' }),
  warnings: T.Array(T.String(), { default: [] }),
  exitCode: T.Optional(T.Number()),
});
export type SuccessBase = T.Static<typeof SuccessBase>;

export const SuccessGeneric = T.Composite([
  SuccessBase,
  T.Object({
    data: T.Record(T.String(), T.Any(), { default: {} }),
  }),
]);
export type SuccessGeneric = T.Static<typeof SuccessGeneric>;

export const isSuccess = <$Output extends FailureBase | SuccessBase>(
  schema: $Output,
): schema is Extract<$Output, { type: 'success' }> =>
  schema.type === SuccessBase.properties.type.const;

export type InferSuccessInit<$DataType extends Definition> = Simplify<
  OptionalizePropertyUnsafe<Omit<InferSuccess<$DataType>, 'type'>, 'data' | 'warnings'>
>;

export type InferSuccess<$DataType extends Definition> = Extract<
  T.Static<$DataType['schema']>,
  { type: 'success' }
>;
