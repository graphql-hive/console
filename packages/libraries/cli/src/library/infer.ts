import BaseCommand from '../base-command';
import { tb } from '../helpers/typebox/__';

export type Infer<$Commands extends CommandIndexGeneric> = {
  [K in keyof $Commands as K extends string ? Uncapitalize<K> : K]: InferFunction<$Commands[K]>;
};

export type InferFunction<$Command extends typeof BaseCommand<any>> = <
  $Args extends InferFunctionParameters<$Command>,
>(
  args: $Args,
) => Promise<InferReturn<$Command, $Args>>;

// prettier-ignore
type InferFunctionParameters<$Command extends typeof BaseCommand<any>> =
		& (
			// @ts-expect-error fixme
			$Command['parameters']['named'] extends tb.Object<any>
			// @ts-expect-error fixme
			? tb.Static<$Command['parameters']['named']>
			: {}
		)
		// todo *optional* positional inference
		& (
			// @ts-expect-error fixme
			'positional' extends keyof $Command['parameters']
			? {
				// @ts-expect-error fixme
				$positional: tb.Static<$Command['parameters']['positional']>
			}
			: {}
		)

// prettier-ignore
type InferReturn<$Command extends typeof BaseCommand<any>, $Args extends Args> =
	$Args extends { json: true }
		? tb.Static<$Command['output']>
		: string

export const renderSubcommandExecution = (
  subCommandName: string,
  args: Record<string, unknown>,
): string => {
  const { $positional, ...named } = args;
  const execArgsPositional = Array.isArray($positional) ? $positional : [];
  const execArgsNamed = Object.entries(named)
    .filter(([_, value]) => value !== undefined) // treat undefined value for optional flags as	if not there.
    .filter(([_, value]) => value !== false) // treat false boolean flags as if not there.
    .flatMap(([name, value]) => {
      const values = Array.isArray(value) ? value : [value]; // expand arrays for support of flags that are allowed to be repeated.
      return values.flatMap(_ => {
        const flagName = `--${name}`;
        if (_ === true) return flagName; // true boolean flags are just the flag name.
        return [flagName, String(value)]; // other values are flag name and value.
      });
    });
  const execArgs = [subCommandName, ...execArgsPositional, ...execArgsNamed].join(' ');
  return execArgs;
};

export type CommandIndexGeneric = Record<string, typeof BaseCommand<any>>;

export interface Args {
  [name: string]: unknown;
}
