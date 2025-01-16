export namespace JSON {
  export const encode = <value extends Value>(value: value): string => {
    return globalThis.JSON.stringify(value);
  };

  export const encodePretty = <value extends Value>(value: value): string => {
    return globalThis.JSON.stringify(value, null, 2);
  };

  export const decode = (value: string): Value => {
    return globalThis.JSON.parse(value);
  };

  export type Value = PrimitiveValue | NonPrimitiveValue;

  export type NonPrimitiveValue = { [key: string]: Value } | Array<Value>;

  export type PrimitiveValue = string | number | boolean | null;
}
