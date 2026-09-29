import { Hook } from '@oclif/core';
import { InvalidCommandError } from '../helpers/errors';

const hook: Hook.CommandNotFound = async function (options) {
  const error = new InvalidCommandError(options.id);
  options.context.error(error, { exit: error.exitCode });
};

export default hook;
