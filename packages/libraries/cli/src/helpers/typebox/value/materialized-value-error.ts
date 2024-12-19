/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */

import { ValueError, ValueErrorIterator } from '@sinclair/typebox/value';

/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */
export type MaterializedValueError = [
  {
    message: string;
    path: string;
    errors: MaterializedValueError[];
  },
];

/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */
export const MaterializeValueError = (error: ValueError) => ({
  message: error.message,
  path: error.path,
  errors: error.errors.map(iterator => MaterializeValueErrorIterator(iterator)),
});

/**
 * @see https://github.com/sinclairzx81/typebox/issues/1044#issuecomment-2451582765
 */
export const MaterializeValueErrorIterator = (
  iterator: ValueErrorIterator,
): MaterializedValueError[] => [...iterator].map(error => MaterializeValueError(error)) as never;
