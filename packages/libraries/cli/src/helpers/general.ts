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

export const toSnakeCase = (str: string): string => {
  return (
    str
      // Handle camelCase to snake_case
      .replace(/([a-z])([A-Z])/g, '$1_$2')
      // Handle PascalCase to snake_case
      .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
      // Replace spaces and hyphens with underscores
      .replace(/[\s-]+/g, '_')
      // Convert to lowercase
      .toLowerCase()
  );
};

export const uncapitalize = <$String extends string>(str: $String): Uncapitalize<$String> => {
  return (str.charAt(0).toLowerCase() + str.slice(1)) as Uncapitalize<$String>;
};
