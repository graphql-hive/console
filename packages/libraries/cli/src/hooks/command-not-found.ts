import { Hook } from '@oclif/core';
import { InvalidCommandError } from '../helpers/errors';

const hook: Hook.CommandNotFound = async function (options) {
  options.context.error(new InvalidCommandError(options.id));
};

export default hook;
