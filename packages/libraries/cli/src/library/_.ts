import { Command } from '@oclif/core';
import { commandIndex } from '../command-index';
import { toSnakeCase, uncapitalize } from '../helpers/general';
import { Args, Infer, renderSubcommandExecution } from './infer';

export { commandIndex as Commands };

export const create = (config: {
  /**
   * Optional middleware to manipulate various aspects of the CLI.
   */
  middleware?: {
    /**
     * Manipulate the arguments before execution runs.
     */
    args?: (args: Args) => Promise<Args>;
  };
  /**
   * Function to execute the sub-command. Generally you will spawn a child process
   * that invokes the CLI like a real user would.
   */
  execute: (command: string) => Promise<string>;
}): Infer<typeof commandIndex> => {
  return Object.fromEntries(
    Object.entries(commandIndex).map(([commandClassName, commandClass]) => {
      return [
        // The property name on the CLI object.
        uncapitalize(commandClassName),
        // The method that runs the command.
        async (args: Args) => {
          const args_ = (await config.middleware?.args?.(args)) ?? args;
          const subCommandPath = inferCommandPath(commandClass);
          const subCommandRendered = renderSubcommandExecution(subCommandPath, args_);
          const result = await config.execute(subCommandRendered);

          if (args_.json) {
            return JSON.parse(result);
          }

          return result;
        },
      ];
    }),
  ) as any;
};

const inferCommandPath = (commandClass: typeof Command) => {
  return toSnakeCase(commandClass.name).replace(/_/g, ':');
};
