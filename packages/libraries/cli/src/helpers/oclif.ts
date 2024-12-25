import { Command } from '@oclif/core';
import { ParserOutput } from '@oclif/core/lib/interfaces/parser';

export type InferInput<$Command extends typeof Command> = Pick<
  ParserOutput<$Command['flags'], $Command['baseFlags'], $Command['args']>,
  'args' | 'flags'
>;
