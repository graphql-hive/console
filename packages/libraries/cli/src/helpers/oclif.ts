import { Command } from '@oclif/core';
import { ParserOutput } from '@oclif/core/lib/interfaces/parser';

export type InferInput<$Command extends typeof Command> = Pick<
  ParserOutput<$Command['flags'], $Command['baseFlags'], $Command['args']>,
  'args' | 'flags'
>;

export type Flags = object;

export type Args = object;

export type Input = { flags: Flags; args: Args };

export * as OClif from './oclif';
