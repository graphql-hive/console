/**
 * This case is impossible.
 * If it happens, then that means there is a bug in our code.
 */
export const neverCase = (value: never): never => {
  never(`Unhandled case: ${String(value)}`);
};

/**
 * This code cannot be reached.
 * If it is reached, then that means there is a bug in our code.
 */
export const never: (contextMessage?: string) => never = contextMessage => {
  contextMessage = contextMessage ?? '(no additional context provided)';
  throw new Error(`Something that should be impossible happened: ${contextMessage}`);
};
