import { Texture } from '../../helpers/texture/__';
import { T } from '../../helpers/typebox/__';
import { SchemaError } from './SchemaError';

export const SchemaErrors = T.Array(SchemaError);

export const schemaErrorsText = (data: T.Static<typeof SchemaErrors>): string => {
  const t = Texture.createBuilder();
  t.failure(`Detected ${data.length} error${Texture.plural(data)}`);
  t.line();
  data.forEach(error => {
    t.indent(Texture.colors.red('-') + ' ' + Texture.boldQuotedWords(error.message));
  });
  return t.state.value.trim();
};
