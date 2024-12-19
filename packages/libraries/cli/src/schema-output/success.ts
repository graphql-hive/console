import { OptionalizePropertyUnsafe, Simplify } from '../helpers/general';
import { tb } from '../helpers/typebox/__';
import { ExcludeFailure } from './failure';
import { OutputBase, OutputBaseT } from './output';

export const SuccessBase = tb.Object({
  ok: tb.Literal(true),
  message: tb.String(),
});
export type SuccessBase = tb.Static<typeof SuccessBase>;

export const SuccessGeneric = tb.Composite([
  SuccessBase,
  tb.Object({
    data: tb.Record(tb.String(), tb.Any()),
  }),
]);
export type SuccessGeneric = tb.Static<typeof SuccessGeneric>;

export const successDefaults: tb.Static<typeof SuccessGeneric> = {
  ok: true,
  message: 'Command succeeded.',
  data: {},
};

export const isSuccess = <$Output extends OutputBase>(
  schema: $Output,
): schema is ExcludeFailure<$Output> => schema.ok;

export type ExcludeSuccess<$Type> = Exclude<$Type, { ok: true }>;

export const success = <$DataInit extends tb.TProperties>(data: $DataInit) =>
  tb.Composite([
    SuccessBase,
    tb.Object({
      data: tb.Object(data),
    }),
  ]);

export type InferSuccessData<$Schema extends OutputBaseT> =
  // @ts-expect-error fixme
  Simplify<InferSuccess<$Schema>['data']>;

export type InferSuccessEnvelopeInit<$Schema extends OutputBaseT> = Simplify<
  OptionalizePropertyUnsafe<Omit<InferSuccess<$Schema>, 'ok'>, 'message' | 'data'>
>;

export type InferSuccess<$Schema extends OutputBaseT> = ExcludeFailure<tb.Static<$Schema>>;
