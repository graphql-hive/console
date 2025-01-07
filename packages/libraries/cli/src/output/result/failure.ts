import { T } from '../../helpers/typebox/__';

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

export const isFailure = <$Output extends object>(
  schema: $Output,
): schema is Extract<$Output, { type: 'failure' }> =>
  'type' in schema && schema.type === FailureBase.properties.type.const;
