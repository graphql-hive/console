export namespace JSON {
  export type Value = PrimitiveValue | NonPrimitiveValue;

  export type NonPrimitiveValue = { [key: string]: Value } | Array<Value>;

  export type PrimitiveValue = string | number | boolean | null;
}
