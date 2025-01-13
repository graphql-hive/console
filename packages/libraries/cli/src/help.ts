import { OClif } from './helpers/oclif';
import { Texture } from './helpers/texture/texture';
import { Output } from './output/_namespace';

interface LoadableCommand extends OClif.Command.Loadable {
  output?: Output.Definition;
}

/**
 * @see https://oclif.io/docs/help_classes/
 * @see https://github.com/oclif/oclif/discussions/1657
 */
export default class MyHelpClass extends OClif.Help {
  async showCommandHelp(command: LoadableCommand): Promise<void> {
    await super.showCommandHelp(command);
    if (command.output) {
      const schema = Output.Definition.getSchemaEncoded(command.output);
      console.log(Texture.colors.bold('JSON OUTPUT SCHEMA'));
      console.log(Texture.indent(schema));
    }
  }
}
