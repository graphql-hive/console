import { Command } from '@oclif/core';
import { ParserOutput } from '@oclif/core/lib/interfaces/parser';

export type InferInput<$Command extends typeof Command> = Pick<
  ParserOutput<$Command['flags'], $Command['baseFlags'], $Command['args']>,
  'args' | 'flags'
>;

export * from '@oclif/core';

export * as OClif from './oclif';

export namespace Types {
  export type Input = { flags: Types.Flags; args: Types.Args };
  export type Flags = object;
  export type Args = object;
}
