import { T } from '../../helpers/typebox/__';
import { SchemaChangeCriticalityLevel } from './SchemaChangeCriticalityLevel';

export const SchemaChange = T.Object({
  message: T.String(),
  criticality: SchemaChangeCriticalityLevel,
  isSafeBasedOnUsage: T.Boolean(),
  approval: T.Nullable(
    T.Object({
      by: T.Nullable(
        T.Object({
          displayName: T.Nullable(T.String()),
        }),
      ),
    }),
  ),
});
export type SchemaChange = T.Static<typeof SchemaChange>;
