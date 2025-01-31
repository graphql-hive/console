import { useCallback, useState } from 'react';
import { z } from 'zod';
import { Kit } from '../kit';

export function useLocalStorageJson<$Schema extends z.ZodType>(...args: ArgsInput<$Schema>) {
  const [key, schema, manualDefaultValue] = args as any as Args<$Schema>;
  // The parameter types will force the user to give a manual default
  // if their given Zod schema does not have default.
  //
  // We resolve that here because in the event of a Zod parse failure, we fallback
  // to the default value, meaning we are needing a reference to the Zod default outside
  // of the regular parse process.
  //
  const defaultValue =
    manualDefaultValue != undefined
      ? manualDefaultValue
      : Kit.ZodHelpers.isDefaultType(schema)
        ? (schema._def.defaultValue() as z.infer<$Schema>)
        : Kit.never();

  const [value, setValue] = useState<z.infer<$Schema>>(() => {
    // Note: `null` is returned for missing values. However Zod only kicks in
    // default values for `undefined`, not `null`. However-however, this is ok,
    // because we manually pre-compute+return the default value, thus we don't
    // rely on Zod's behaviour. If that changes this should have `?? undefined`
    // added.
    const storedValue = localStorage.getItem(key);

    if (!storedValue) {
      return defaultValue;
    }

    // todo: Some possible improvements:
    // - Monitor schema parse failures.
    // - Let caller choose an error strategy: 'return' / 'default' / 'throw'
    try {
      const parsed = JSON.parse(storedValue);
      return schema.parse(parsed);
    } catch (_) {
      return defaultValue;
    }
  });

  const set = useCallback(
    (value: z.infer<$Schema>) => {
      localStorage.setItem(key, JSON.stringify(value));
      setValue(value);
    },
    [key],
  );

  return [value, set] as const;
}

type ArgsInput<$Schema extends z.ZodType> =
  $Schema extends z.ZodDefault<z.ZodType>
    ? [key: string, schema: GuardZodJsonSchema<$Schema>]
    : [key: string, schema: GuardZodJsonSchema<$Schema>, defaultValue: z.infer<$Schema>];

type GuardZodJsonSchema<$Schema extends z.ZodType> =
  z.infer<$Schema> extends Kit.Json.Value
    ? $Schema
    : 'Error: Your Zod schema is or contains a type that is not valid JSON.';

type Args<$Schema extends z.ZodType> = [
  key: string,
  schema: $Schema,
  defaultValue?: z.infer<$Schema>,
];
