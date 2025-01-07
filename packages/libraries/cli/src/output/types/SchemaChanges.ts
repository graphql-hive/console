import { Texture } from '../../helpers/texture/__';
import { T } from '../../helpers/typebox/__';
import { SchemaChange } from './SchemaChange';
import {
  SchemaChangeCriticalityLevel,
  schemaChangeCriticalityLevel,
} from './SchemaChangeCriticalityLevel';

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
          Texture.boldQuotedWords(change.message),
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
