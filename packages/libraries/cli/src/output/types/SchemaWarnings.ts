import { Texture } from '../../helpers/texture/__';
import { T } from '../../helpers/typebox/__';
import { SchemaWarning } from './SchemaWarning';

export const SchemaWarnings = T.Array(SchemaWarning);

export type SchemaWarnings = T.Static<typeof SchemaWarnings>;

export const schemaWarningsText = (warnings: SchemaWarnings): string => {
  const t = Texture.createBuilder();
  t.warning(`Detected ${warnings.length} warning${Texture.plural(warnings)}`);
  t.line();
  warnings.forEach(warning => {
    const details = [
      warning.source ? `source: ${Texture.boldQuotedWords(warning.source)}` : undefined,
    ]
      .filter(Boolean)
      .join(', ');
    t.indent(`- ${Texture.boldQuotedWords(warning.message)}${details ? ` (${details})` : ''}`);
  });
  return t.state.value.trim();
};
