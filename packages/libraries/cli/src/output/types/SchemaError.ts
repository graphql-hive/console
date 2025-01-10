import { T } from '../../helpers/typebox/__';

export const SchemaError = T.Object({
  message: T.String(),
});

export type SchemaError = T.Static<typeof SchemaError>;
