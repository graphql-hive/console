import { OptionalizePropertyUnsafe, Simplify } from '../../helpers/general';
import { T } from '../../helpers/typebox/__';

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
