import { OClif } from './helpers/oclif';
import { Texture } from './helpers/texture/texture';
import { T } from './helpers/typebox/_namespace';
import { Output } from './output/_namespace';

interface LoadableCommand extends OClif.Command.Loadable {
  output?: Output.Definition[];
}

/**
 * @see https://oclif.io/docs/help_classes/
 * @see https://github.com/oclif/oclif/discussions/1657
 */
export default class MyHelpClass extends OClif.Help {
  async showCommandHelp(command: LoadableCommand): Promise<void> {
    await super.showCommandHelp(command);
    const outputSchemas = command.output?.map(definition => definition.schema) ?? [];
    if (outputSchemas.length > 0) {
      const jsonOutputSchema = T.Union(outputSchemas);
      console.log(Texture.colors.bold('JSON OUTPUT SCHEMA'));
      console.log(`  ${JSON.stringify(jsonOutputSchema)}`);
    }
  }
}
