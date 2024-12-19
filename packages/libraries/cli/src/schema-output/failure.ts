import { OptionalizePropertyUnsafe, Simplify } from '../helpers/general';
import { tb } from '../helpers/typebox/__';
import { OutputBase, OutputBaseT } from './output';
import { ExcludeSuccess } from './success';

export const FailureBase = tb.Object({
  ok: tb.Literal(false),
  exitCode: tb.Integer({ minimum: 1 }),
  code: tb.String(),
  message: tb.String(),
  url: tb.Nullable(tb.String({ format: 'uri' })),
  suggestions: tb.Array(tb.String()),
});
export type FailureBase = tb.Static<typeof FailureBase>;

export const FailureGeneric = tb.Composite([
  FailureBase,
  tb.Object({
    data: tb.Record(tb.String(), tb.Any()),
  }),
]);
export type FailureGeneric = tb.Static<typeof FailureGeneric>;

export const failure = <$Context extends tb.TProperties>(context: $Context) =>
  tb.Composite([FailureBase, tb.Object({ data: tb.Object(context) })]);

export const isFailure = <$Ouput extends OutputBase>(
  schema: $Ouput,
): schema is ExcludeSuccess<$Ouput> => !schema.ok;

export type ExcludeFailure<$Type> = Exclude<$Type, { ok: false }>;

export const failureDefaults: tb.Static<typeof FailureGeneric> = {
  ok: false,
  exitCode: 1,
  code: 'unexpected',
  message: 'Command failed.',
  url: null,
  suggestions: [],
  data: {},
};

export type InferFailureData<$Schema extends OutputBaseT> =
  // @ts-expect-error fixme
  Simplify<InferFailure<$Schema>['data']>;

export type InferFailureEnvelopeInit<$Schema extends OutputBaseT> = Simplify<
  OptionalizePropertyUnsafe<
    Omit<InferFailure<$Schema>, 'ok'>,
    'message' | 'exitCode' | 'code' | 'url' | 'suggestions'
  >
>;

export type InferFailure<$Schema extends OutputBaseT> = ExcludeSuccess<tb.Static<$Schema>>;
