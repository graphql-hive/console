import { Texture } from '../../texture/texture';
import { Schema } from '../schema';

export namespace SchemaWarningConnection {
  export const print = (warnings: Schema.SchemaWarningConnection) => {
    const t = Texture.createBuilder();
    t.line();
    t.warning(`Detected ${warnings.total} warning${warnings.total > 1 ? 's' : ''}`);
    t.line();

    warnings.nodes.forEach(warning => {
      const details = [
        warning.source ? `source: ${Texture.boldQuotedWords(warning.source)}` : undefined,
      ]
        .filter(Boolean)
        .join(', ');

      t.indent(`- ${Texture.boldQuotedWords(warning.message)}${details ? ` (${details})` : ''}`);
    });

    return t.state.value;
  };
}
