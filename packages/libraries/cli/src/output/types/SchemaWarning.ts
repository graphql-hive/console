import { T } from '../../helpers/typebox/__';

export const SchemaWarning = T.Object({
  message: T.String(),
  source: T.Nullable(T.String()),
  line: T.Nullable(T.Number()),
  column: T.Nullable(T.Number()),
});
export type SchemaWarning = T.Static<typeof SchemaWarning>;
