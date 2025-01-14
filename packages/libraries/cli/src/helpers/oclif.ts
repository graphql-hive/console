import { Command } from '@oclif/core';
import oclifPrettyPrintError from '@oclif/core/lib/errors/errors/pretty-print';
import { ParserOutput } from '@oclif/core/lib/interfaces/parser';

export * from '@oclif/core';

export const prettyPrintError: (...parameters: Parameters<typeof oclifPrettyPrintError>) => string =
  // For some reason OClif suggests that prettyPrintError can return `undefined`,
  // However the implementation does not appear to agree with that: https://github.com/oclif/core/blob/main/src/errors/errors/pretty-print.ts#L33-L57
  // Anyways, this wrapper function conservatively removes the `undefined` return type.
  (...parameters) => oclifPrettyPrintError(...parameters) || '';

export type InferInput<$Command extends typeof Command> = Pick<
  ParserOutput<$Command['flags'], $Command['baseFlags'], $Command['args']>,
  'args' | 'flags'
>;

// export namespace Types {
//   export type Input = {
//     flags: Flags;
//     args: Args;
//   };
//   export type Flags = object;
//   export type Args = object;
// }

export * as OClif from './oclif';
