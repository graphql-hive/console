import { Texture } from '../../texture/texture';
import { Schema } from '../schema';

export namespace SchemaErrorConnection {
  export const print = (errors: Schema.SchemaErrorConnection) => {
    const t = Texture.createBuilder();
    t.failure(`Detected ${errors.total} error${errors.total > 1 ? 's' : ''}`);
    t.line();
    errors.nodes.forEach(error => {
      t.indent(Texture.colors.red('-') + ' ' + Texture.boldQuotedWords(error.message));
    });
    return t.state.value;
  };
  export const toSchemaOutput = (errors: Schema.SchemaErrorConnection) => {
    return errors.nodes.map(error => {
      return {
        message: error.message,
      };
    });
  };
}
