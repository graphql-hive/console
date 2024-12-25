import { SchemaHive } from '../helpers/schema';
import { Tex } from '../helpers/tex/__';
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
  const s = Tex.createBuilder();
  const writeChanges = (schemaChanges: SchemaChange[]) => {
    return schemaChanges
      .map(change => {
        const parts = [
          criticalityMap[
            change.isSafeBasedOnUsage ? schemaChangeCriticalityLevel.Safe : change.criticality
          ],
          Tex.bolderize(change.message),
        ];
        if (change.isSafeBasedOnUsage) {
          parts.push(Tex.colors.green('(Safe based on usage ✓)'));
        }
        if (change.approval) {
          parts.push(
            Tex.colors.green(`(Approved by ${change.approval.by?.displayName ?? '<unknown>'} ✓)`),
          );
        }

        return Tex.indent + parts.join(Tex.space);
      })
      .join(Tex.newline);
  };

  s.info(`Detected ${data.length} change${Tex.plural(data)}`);
  s.line();

  if (breakingChanges.length) {
    s.indent(`Breaking changes:`);
    s.line(writeChanges(breakingChanges));
    s.line();
  }

  if (safeChanges.length) {
    s.indent(`Safe changes:`);
    s.line(writeChanges(safeChanges));
    s.line();
  }

  return s.state.value.trim();
};

const criticalityMap = {
  [schemaChangeCriticalityLevel.Breaking]: Tex.colors.red('-'),
  [schemaChangeCriticalityLevel.Safe]: Tex.colors.green('-'),
  [schemaChangeCriticalityLevel.Dangerous]: Tex.colors.green('-'),
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
  const s = Tex.createBuilder();
  s.warning(`Detected ${warnings.length} warning${Tex.plural(warnings)}`);
  s.line();
  warnings.forEach(warning => {
    const details = [warning.source ? `source: ${Tex.bolderize(warning.source)}` : undefined]
      .filter(Boolean)
      .join(', ');
    s.indent(`- ${Tex.bolderize(warning.message)}${details ? ` (${details})` : ''}`);
  });
  return s.state.value.trim();
};

export const SchemaError = T.Object({
  message: T.String(),
});

export type SchemaError = T.Static<typeof SchemaError>;

export const SchemaErrors = T.Array(SchemaError);
export const schemaErrorsText = (data: T.Static<typeof SchemaErrors>): string => {
  const s = Tex.createBuilder();
  s.failure(`Detected ${data.length} error${Tex.plural(data)}`);
  s.line();
  data.forEach(error => {
    s.indent(Tex.colors.red('-') + ' ' + Tex.bolderize(error.message));
  });
  return s.state.value.trim();
};

export const AppDeploymentStatus = T.Enum({
  active: SchemaHive.AppDeploymentStatus.Active,
  pending: SchemaHive.AppDeploymentStatus.Pending,
  retired: SchemaHive.AppDeploymentStatus.Retired,
});
export type AppDeploymentStatus = T.Static<typeof AppDeploymentStatus>;
