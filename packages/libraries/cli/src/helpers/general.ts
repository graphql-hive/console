/**
 * This module is for assorted "standard library" like functions and types each of
 * which are to simple or incomplete to justify factoring out to a dedicated module.
 */

/**
 * This code should never be reached.
 */
export const casesExhausted = (value: never): never => {
  throw new Error(`Unhandled case: ${String(value)}`);
};

export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] };

export type OptionalizePropertyUnsafe<$Object extends object, $Key extends PropertyKey> = Omit<
  $Object,
  $Key
> & {
  [_ in keyof $Object as _ extends $Key ? _ : never]?: $Object[_];
};

export type Simplify<T> = {
  [K in keyof T]: T[K];
};

/**
 * Inverts a matrix.
 *
 * For example, semantically, given a set of rows you would get back a set of columns.
 *
 * When inverting the matrix, it is possible the inverse will contain cells with `undefined` values, if the input set was not uniform.
 *
 * For example [['a','b'],[],['z','y']] will invert to [['a', undefined, 'z'], ['b', undefined, 'y']]
 */
export const invertMatrix = <$Type>(matrix: $Type[][]): ($Type | undefined)[][] => {
  const rows = matrix.length;
  const cols = matrix[0].length;
  const inverted = Array.from({ length: cols }, () => Array(rows).fill(''));
  for (let rowIndex = 0; rowIndex < rows; rowIndex++) {
    for (let colIndex = 0; colIndex < cols; colIndex++) {
      inverted[colIndex][rowIndex] = matrix[rowIndex][colIndex];
    }
  }
  return inverted;
};
