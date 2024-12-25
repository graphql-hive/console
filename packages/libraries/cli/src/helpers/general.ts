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
