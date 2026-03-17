import { z } from 'zod';
import { ZodHelpers } from './zod-helpers';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Json {
  export const Primitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);
  export type Primitive = z.infer<typeof Primitive>;
  export const isPrimitive = ZodHelpers.createTypeGuard(Primitive);

  export const Value: z.ZodType<Value> = z.lazy(() =>
    z.union([Primitive, z.array(Value), z.record(Value)]),
  );
  export type Value = Primitive | { [key: string]: Value } | Value[];
  export const isValue = ZodHelpers.createTypeGuard(Value);

  export const Object: z.ZodType<Object> = z.record(Value);
  export type Object = { [key: string]: Value };
  export const isObject = ZodHelpers.createTypeGuard(Object);
}
