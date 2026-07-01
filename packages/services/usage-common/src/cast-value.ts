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
    // This does not handle an array of anything but strings
    return `"[${value.map(val => `'${val}'`).join(',')}]"`;
  }

  if (value === undefined || value === null) {
    return '\\N'; // NULL is \N
    // Yes, it's ᴺᵁᴸᴸ not NULL :) This is what JSONStringsEachRow does for NULLs
  }

  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value);
    return `"${jsonStr.replace(/'/g, "''").replace(/"/g, "'")}"`;
  }

  // consider throwing due to unhandled type.
  return '\\N';
}

export function castTuple(value: any[]): string {
  const contents = value.map(formatClickHouseValue).join(',');
  return `(${contents})`;
}

const formatClickHouseValue = (val: unknown): string => {
  if (typeof val === 'string') {
    const escaped = val.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    return `'${escaped}'`;
  }
  if (val === null || val === undefined) {
    return '\\N';
  }
  if (val instanceof Date) {
    return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
  }
  // If your tuples contain nested arrays, recurse through them
  if (Array.isArray(val)) {
    return `[${val.map(formatClickHouseValue).join(',')}]`;
  }
  return String(val);
};
