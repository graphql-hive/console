/** cast JSON value to a ClickHouse CSV insertable value */
export function castValue(value: boolean): number;
export function castValue(value: string): string;
export function castValue(value: number): number;
export function castValue(value: any[]): string;
export function castValue(value?: any): string;
export function castValue(value: undefined): string;
export function castValue(value: object): string;
export function castValue(value?: any) {
  if (typeof value === 'boolean') {
    return castValue(value ? 1 : 0);
  }

  if (typeof value === 'string') {
    // According to https://datatracker.ietf.org/doc/html/rfc4180
    // if double-quotes are used to enclose fields,
    // then a double-quote appearing inside a field
    // must be escaped by preceding it with another double quote
    return `"${value.replace(/"/g, '""')}"`;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (Array.isArray(value)) {
    return `"[${value.map(val => `'${val}'`).join(',')}]"`;
  }

  if (value === undefined || value === null) {
    return '\\N'; // NULL is \N
    // Yes, it's ᴺᵁᴸᴸ not NULL :) This is what JSONStringsEachRow does for NULLs
  }

  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value);
    return `"${jsonStr.replace(/"/g, '""')}"`;
  }

  // consider throwing due to unhandled type.
  return '\\N';
}
