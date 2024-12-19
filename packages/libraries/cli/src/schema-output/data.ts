import { SchemaHive } from '../helpers/schema';
import { tb } from '../helpers/typebox/__';

export const SchemaChangeCriticalityLevel = tb.Enum({
  Breaking: 'Breaking',
  Dangerous: 'Dangerous',
  Safe: 'Safe',
});

export const SchemaChange = tb.Object({
  message: tb.String(),
  criticality: SchemaChangeCriticalityLevel,
  isSafeBasedOnUsage: tb.Boolean(),
  approval: tb.Nullable(
    tb.Object({
      by: tb.Nullable(
        tb.Object({
          displayName: tb.Nullable(tb.String()),
        }),
      ),
    }),
  ),
});
export type SchemaChange = tb.Static<typeof SchemaChange>;

export const SchemaWarning = tb.Object({
  message: tb.String(),
  source: tb.Nullable(tb.String()),
  line: tb.Nullable(tb.Number()),
  column: tb.Nullable(tb.Number()),
});
export type SchemaWarning = tb.Static<typeof SchemaWarning>;

export const SchemaError = tb.Object({
  message: tb.String(),
});
export type SchemaError = tb.Static<typeof SchemaError>;

export const AppDeploymentStatus = tb.Enum({
  active: SchemaHive.AppDeploymentStatus.Active,
  pending: SchemaHive.AppDeploymentStatus.Pending,
  retired: SchemaHive.AppDeploymentStatus.Retired,
});
export type AppDeploymentStatus = tb.Static<typeof AppDeploymentStatus>;
