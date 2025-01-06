import { SchemaHive } from '../helpers/schema';
import { Texture } from '../helpers/texture/__';
import { T } from '../helpers/typebox/__';

export const schemaChangeCriticalityLevel = {
  Breaking: 'Breaking',
  Dangerous: 'Dangerous',
  Safe: 'Safe',
} as const;
export type SchemaChangeCriticalityLevel = keyof typeof schemaChangeCriticalityLevel;

export const SchemaChange = T.Object({
  message: T.String(),
  criticality: T.Enum(schemaChangeCriticalityLevel),
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

export const SchemaChanges = T.Array(SchemaChange);
export type SchemaChanges = T.Static<typeof SchemaChanges>;
export const schemaChangesText = (data: SchemaChanges): string => {
  const breakingChanges = data.filter(
    change => change.criticality === schemaChangeCriticalityLevel.Breaking,
  );
  const safeChanges = data.filter(
    change => change.criticality !== schemaChangeCriticalityLevel.Breaking,
  );
  const t = Texture.createBuilder();
  const writeChanges = (schemaChanges: SchemaChange[]) => {
    return schemaChanges
      .map(change => {
        const parts = [
          criticalityMap[
            change.isSafeBasedOnUsage ? schemaChangeCriticalityLevel.Safe : change.criticality
          ],
          Texture.bolderize(change.message),
        ];
        if (change.isSafeBasedOnUsage) {
          parts.push(Texture.colors.green('(Safe based on usage ✓)'));
        }
        if (change.approval) {
          parts.push(
            Texture.colors.green(
              `(Approved by ${change.approval.by?.displayName ?? '<unknown>'} ✓)`,
            ),
          );
        }

        return Texture.indent + parts.join(Texture.space);
      })
      .join(Texture.newline);
  };

  t.info(`Detected ${data.length} change${Texture.plural(data)}`);
  t.line();

  if (breakingChanges.length) {
    t.indent(`Breaking changes:`);
    t.line(writeChanges(breakingChanges));
    t.line();
  }

  if (safeChanges.length) {
    t.indent(`Safe changes:`);
    t.line(writeChanges(safeChanges));
    t.line();
  }

  return t.state.value.trim();
};

const criticalityMap = {
  [schemaChangeCriticalityLevel.Breaking]: Texture.colors.red('-'),
  [schemaChangeCriticalityLevel.Safe]: Texture.colors.green('-'),
  [schemaChangeCriticalityLevel.Dangerous]: Texture.colors.green('-'),
} satisfies Record<SchemaChangeCriticalityLevel, string>;

export const SchemaWarning = T.Object({
  message: T.String(),
  source: T.Nullable(T.String()),
  line: T.Nullable(T.Number()),
  column: T.Nullable(T.Number()),
});
export type SchemaWarning = T.Static<typeof SchemaWarning>;

export const SchemaWarnings = T.Array(SchemaWarning);
export type SchemaWarnings = T.Static<typeof SchemaWarnings>;
export const schemaWarningsText = (warnings: SchemaWarnings): string => {
  const t = Texture.createBuilder();
  t.warning(`Detected ${warnings.length} warning${Texture.plural(warnings)}`);
  t.line();
  warnings.forEach(warning => {
    const details = [warning.source ? `source: ${Texture.bolderize(warning.source)}` : undefined]
      .filter(Boolean)
      .join(', ');
    t.indent(`- ${Texture.bolderize(warning.message)}${details ? ` (${details})` : ''}`);
  });
  return t.state.value.trim();
};

export const SchemaError = T.Object({
  message: T.String(),
});

export type SchemaError = T.Static<typeof SchemaError>;

export const SchemaErrors = T.Array(SchemaError);
export const schemaErrorsText = (data: T.Static<typeof SchemaErrors>): string => {
  const t = Texture.createBuilder();
  t.failure(`Detected ${data.length} error${Texture.plural(data)}`);
  t.line();
  data.forEach(error => {
    t.indent(Texture.colors.red('-') + ' ' + Texture.bolderize(error.message));
  });
  return t.state.value.trim();
};

export const AppDeploymentStatus = T.Enum({
  active: SchemaHive.AppDeploymentStatus.Active,
  pending: SchemaHive.AppDeploymentStatus.Pending,
  retired: SchemaHive.AppDeploymentStatus.Retired,
});
export type AppDeploymentStatus = T.Static<typeof AppDeploymentStatus>;
