import { config as dotenv } from 'dotenv';
import zod from 'zod';
import { parseClickHouseConfigFromEnvironment } from '@hive/service-common';

dotenv({
  debug: true,
  encoding: 'utf8',
});

const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input == 'number') return input;
  if (isNumberString(input)) return Number(input);
};

const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

// treat an empty string (`''`) as undefined
const emptyString = <T extends zod.ZodType>(input: T) => {
  return zod.preprocess((value: unknown) => {
    if (value === '') return undefined;
    return value;
  }, input);
};

const EnvironmentModel = zod.object({
  ENVIRONMENT: emptyString(zod.string().optional()),
  RELEASE: emptyString(zod.string().optional()),
  MIGRATOR: emptyString(zod.string().optional()),
  CLICKHOUSE_MIGRATOR: emptyString(zod.string().optional()),
});

const PostgresModel = zod.object({
  POSTGRES_SSL: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  POSTGRES_HOST: zod.string(),
  POSTGRES_PORT: NumberFromString,
  POSTGRES_DB: zod.string(),
  POSTGRES_USER: zod.string(),
  POSTGRES_PASSWORD: emptyString(zod.string().optional()),
});

const configs = {
  base: EnvironmentModel.safeParse(process.env),

  postgres: PostgresModel.safeParse(process.env),
};

const environmentErrors: Array<string> = [];

for (const config of Object.values(configs)) {
  if (config.success === false) {
    environmentErrors.push(JSON.stringify(config.error.format(), null, 4));
  }
}

const clickhouseConfigResult = process.env.CLICKHOUSE_PROTOCOL
  ? parseClickHouseConfigFromEnvironment(process.env)
  : null;

if (clickhouseConfigResult?.type === 'error') {
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

const base = extractConfig(configs.base);
const postgres = extractConfig(configs.postgres);

export const env = {
  environment: base.ENVIRONMENT,
  release: base.RELEASE ?? 'local',
  postgres: {
    host: postgres.POSTGRES_HOST,
    port: postgres.POSTGRES_PORT,
    db: postgres.POSTGRES_DB,
    user: postgres.POSTGRES_USER,
    password: postgres.POSTGRES_PASSWORD,
    ssl: postgres.POSTGRES_SSL === '1',
  },
  clickhouse: clickhouseConfigResult?.type === 'ok' ? clickhouseConfigResult.config : null,
  isMigrator: base.MIGRATOR === 'up',
  isClickHouseMigrator: base.CLICKHOUSE_MIGRATOR === 'up',
} as const;
