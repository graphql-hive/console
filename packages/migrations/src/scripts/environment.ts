import { config as dotenv } from 'dotenv';
import zod from 'zod';
import type { PostgresConnectionParamaters } from '@hive/postgres';
import { fail, parseClickHouseConfigFromEnvironment } from '@hive/service-common';

dotenv({
  debug: true,
  encoding: 'utf8',
});

const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input == 'number') return input;
  if (isNumberString(input)) return Number(input);
};

const emptyString = <T extends zod.ZodType>(input: T) => {
  return zod.preprocess((value: unknown) => {
    if (value === '') return undefined;
    return value;
  }, input);
};

const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

const PostgresModel = zod.object({
  POSTGRES_SSL: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  POSTGRES_HOST: zod.string(),
  POSTGRES_PORT: NumberFromString,
  POSTGRES_DB: zod.string(),
  POSTGRES_USER: zod.string(),
  POSTGRES_PASSWORD: emptyString(zod.string().optional()),
});

const configs = {
  postgres: PostgresModel.safeParse(process.env),
};

const environmentErrors: Array<string> = [];

for (const config of Object.values(configs)) {
  if (config.success === false) {
    environmentErrors.push(JSON.stringify(config.error.format(), null, 4));
  }
}

const clickhouseConfigResult = parseClickHouseConfigFromEnvironment(process.env);

if (clickhouseConfigResult.type === 'error') {
  environmentErrors.push(...clickhouseConfigResult.errors);
}

if (environmentErrors.length) {
  const fullError = environmentErrors.join(`\n`);
  console.error('❌ Invalid environment variables:', fullError);
  process.exit(1);
}

function extractConfig<Input, Output>(config: zod.SafeParseReturnType<Input, Output>): Output {
  if (!config.success) {
    throw new Error('Something went wrong.');
  }
  return config.data;
}

const postgres = extractConfig(configs.postgres);

export const env = {
  clickhouse:
    clickhouseConfigResult.type === 'ok'
      ? clickhouseConfigResult.config
      : fail('Unreachable: ClickHouse config errors are caught above via process.exit(1)'),
  postgres: {
    host: postgres.POSTGRES_HOST,
    port: postgres.POSTGRES_PORT,
    db: postgres.POSTGRES_DB,
    user: postgres.POSTGRES_USER,
    password: postgres.POSTGRES_PASSWORD,
    ssl: postgres.POSTGRES_SSL === '1',
  } satisfies PostgresConnectionParamaters,
} as const;
