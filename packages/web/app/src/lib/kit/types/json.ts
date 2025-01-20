export namespace JSON {
  export const decodeSafe = <$UnsafeCast extends Value = Value>(
    encodedValue: string,
  ): $UnsafeCast | SyntaxError => {
    try {
      return decode(encodedValue) as $UnsafeCast;
    } catch (error) {
      return error as SyntaxError;
    }
  };

  export const decode = (value: string): Value => {
    return globalThis.JSON.parse(value);
  };

  export type Value = PrimitiveValue | NonPrimitiveValue;

  export type NonPrimitiveValue = { [key: string]: Value } | Array<Value>;

  export type PrimitiveValue = string | number | boolean | null;

  // If team wants symmetric code across encoding/decoding of JSON, we can use this:
  // export const encode = <value extends Value>(value: value): string => {
  //   return globalThis.JSON.stringify(value);
  // };

  // export const encodePretty = <value extends Value>(value: value): string => {
  //   return globalThis.JSON.stringify(value, null, 2);
  // };
}
