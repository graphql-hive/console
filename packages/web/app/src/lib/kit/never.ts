/**
 * This case is impossible.
 * If it happens, then that means there is a bug in our code.
 */
export const neverCase = (value: never): never => {
  never({ type: 'case', value });
};

/**
 * This code cannot be reached.
 * If it is reached, then that means there is a bug in our code.
 */
export const never: (context?: object) => never = context => {
  throw new Error(`Something that should be impossible happened`, { cause: context });
};
