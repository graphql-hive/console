import { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ZodHelpers {
  export const isDefaultType = (zodType: z.ZodType): zodType is z.ZodDefault<z.ZodType> => {
    return zodType instanceof z.ZodDefault;
  };

  export const createTypeGuard =
    <$Schema extends z.ZodType, $Value = z.infer<$Schema>>(schema: $Schema) =>
    (value: unknown): value is $Value => {
      const result = schema.safeParse(value);
      return result.success;
    };
}
