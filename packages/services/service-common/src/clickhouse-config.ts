import { z } from 'zod';

const isNumberString = (input: unknown) => z.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input === 'number') return input;
  if (isNumberString(input)) return Number(input);
};

const NumberFromString = z.preprocess(numberFromNumberOrNumberString, z.number().min(1));

const emptyString = <T extends z.ZodType>(input: T) =>
  z.preprocess((value: unknown) => (value === '' ? undefined : value), input);

export const ClickHouseModel = z.object({
  CLICKHOUSE_PROTOCOL: z.union([z.literal('http'), z.literal('https')]),
  CLICKHOUSE_HOST: z.string(),
  CLICKHOUSE_DB: emptyString(
    z
      .string()
      .regex(/^[A-Za-z_][A-Za-z0-9_]*$/, 'can only contain alphanumeric characters and "_"')
      .optional(),
  ),
  CLICKHOUSE_PORT: NumberFromString,
  CLICKHOUSE_USERNAME: z.string(),
  CLICKHOUSE_PASSWORD: z.string(),
});

export type ClickHouseEnvironment = z.infer<typeof ClickHouseModel>;

export type ClickHouseConfig = {
  protocol: 'http' | 'https';
  host: string;
  database: string;
  port: number;
  username: string;
  password: string;
};

export type ParseClickHouseConfigFromEnvironmentResult =
  | { type: 'error'; errors: Array<string> }
  | { type: 'ok'; config: ClickHouseConfig };

export function parseClickHouseConfigFromEnvironment(
  env: NodeJS.ProcessEnv,
): ParseClickHouseConfigFromEnvironmentResult {
  const parseResult = ClickHouseModel.safeParse(env);

  if (!parseResult.success) {
    return {
      type: 'error',
      errors: [JSON.stringify(parseResult.error.format(), null, 4)],
    };
  }

  return {
    type: 'ok',
    config: {
      protocol: parseResult.data.CLICKHOUSE_PROTOCOL,
      host: parseResult.data.CLICKHOUSE_HOST,
      database: parseResult.data.CLICKHOUSE_DB ?? 'default',
      port: parseResult.data.CLICKHOUSE_PORT,
      username: parseResult.data.CLICKHOUSE_USERNAME,
      password: parseResult.data.CLICKHOUSE_PASSWORD,
    },
  };
}
