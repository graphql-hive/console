import { T } from '../../helpers/typebox/__';

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

export const isSuccess = <$Output extends object>(
  schema: $Output,
): schema is Extract<$Output, { type: 'success' }> =>
  'type' in schema && schema.type === SuccessBase.properties.type.const;
