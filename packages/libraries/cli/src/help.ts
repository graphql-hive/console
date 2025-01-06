import { Command, Help } from '@oclif/core';

interface LoadableCommand extends Command.Loadable {
  output?: {
    schema: object;
  }[];
}

/**
 * @see https://oclif.io/docs/help_classes/
 * @see https://github.com/oclif/oclif/discussions/1657
 */
export default class MyHelpClass extends Help {
  async showCommandHelp(command: LoadableCommand): Promise<void> {
    await super.showCommandHelp(command);
    const outputSchemas = command.output?.map(_ => _.schema) ?? [];
    if (outputSchemas.length > 0) {
      const jsonOutputSchema = {
        anyOf: outputSchemas,
      };
      console.log('\x1b[1mJSON OUTPUT SCHEMA\x1b[0m');
      console.log(`  ${JSON.stringify(jsonOutputSchema)}`);
    }
  }
}
