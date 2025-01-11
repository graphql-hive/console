/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */

import { Array, Object, Recursive, Static, String, Unknown } from '@sinclair/typebox';
import { ValueError, ValueErrorIterator } from '@sinclair/typebox/value';

export const MaterializedValueErrorT = Recursive(
  Self =>
    Object({
      message: String(),
      path: String(),
      value: Unknown(),
      errors: Array(Self),
    }),
  { $id: 'MaterializedValueError' },
);

/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */
type MaterializedValueError = Static<typeof MaterializedValueErrorT>;

/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */
export const MaterializeValueError = (error: ValueError) => ({
  message: error.message,
  value: error.value,
  path: error.path,
  errors: error.errors.map(iterator => MaterializeValueErrorIterator(iterator)),
});

/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */
export const MaterializeValueErrorIterator = (
  iterator: ValueErrorIterator,
): MaterializedValueError[] => [...iterator].map(error => MaterializeValueError(error)) as never;
