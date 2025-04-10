import zod from 'zod';
import { OpenTelemetryConfigurationModel } from '@hive/service-common';

const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input == 'number') return input;
  if (isNumberString(input)) return Number(input);
};

export const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

/**
 * treat an empty string (`''`) as undefined
 */
export const emptyString = <T extends zod.ZodType>(input: T) => {
  return zod.preprocess((value: unknown) => {
    if (value === '') return undefined;
    return value;
  }, input);
};

const EnvironmentModel = zod.object({
  PORT: emptyString(NumberFromString.optional()),
  ENVIRONMENT: emptyString(zod.string().optional()),
  RELEASE: emptyString(zod.string().optional()),
});

const SentryModel = zod.union([
  zod.object({
    SENTRY: emptyString(zod.literal('0').optional()),
  }),
  zod.object({
    SENTRY: zod.literal('1'),
    SENTRY_DSN: zod.string(),
  }),
]);

const PrometheusModel = zod.object({
  PROMETHEUS_METRICS: emptyString(zod.union([zod.literal('0'), zod.literal('1')]).optional()),
  PROMETHEUS_METRICS_LABEL_INSTANCE: emptyString(zod.string().optional()),
  PROMETHEUS_METRICS_PORT: emptyString(NumberFromString.optional()),
});

const LogModel = zod.object({
  LOG_LEVEL: emptyString(
    zod
      .union([
        zod.literal('trace'),
        zod.literal('debug'),
        zod.literal('info'),
        zod.literal('warn'),
        zod.literal('error'),
        zod.literal('fatal'),
        zod.literal('silent'),
      ])
      .optional(),
  ),
  REQUEST_LOGGING: emptyString(zod.union([zod.literal('0'), zod.literal('1')]).optional()).default(
    '1',
  ),
});

const ClickHouseModel = zod.object({
  CLICKHOUSE_PROTOCOL: zod.union([zod.literal('http'), zod.literal('https')]),
  CLICKHOUSE_HOST: zod.string(),
  CLICKHOUSE_PORT: NumberFromString,
  CLICKHOUSE_USERNAME: zod.string(),
  CLICKHOUSE_PASSWORD: zod.string(),
});

const PostgresModel = zod.object({
  POSTGRES_SSL: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  POSTGRES_HOST: zod.string(),
  POSTGRES_PORT: NumberFromString,
  POSTGRES_DB: zod.string(),
  POSTGRES_USER: zod.string(),
  POSTGRES_PASSWORD: emptyString(zod.string().optional()),
});

const HiveServicesModel = zod.object({
  EMAILS_ENDPOINT: emptyString(zod.string().url().optional()),
  WEB_APP_URL: emptyString(zod.string().url().optional()),
});

const RateLimitModel = zod.object({
  LIMIT_CACHE_UPDATE_INTERVAL_MS: emptyString(NumberFromString.optional()),
});

const StripeModel = zod.object({
  STRIPE_SECRET_KEY: zod.string(),
  STRIPE_SYNC_INTERVAL_MS: emptyString(NumberFromString.optional()),
});

const configs = {
  base: EnvironmentModel.safeParse(process.env),
  sentry: SentryModel.safeParse(process.env),
  clickhouse: ClickHouseModel.safeParse(process.env),
  postgres: PostgresModel.safeParse(process.env),
  prometheus: PrometheusModel.safeParse(process.env),
  log: LogModel.safeParse(process.env),
  tracing: OpenTelemetryConfigurationModel.safeParse(process.env),
  hiveServices: HiveServicesModel.safeParse(process.env),
  rateLimit: RateLimitModel.safeParse(process.env),
  stripe: StripeModel.safeParse(process.env),
};

const environmentErrors: Array<string> = [];

for (const config of Object.values(configs)) {
  if (config.success === false) {
    environmentErrors.push(JSON.stringify(config.error.format(), null, 4));
  }
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
const clickhouse = extractConfig(configs.clickhouse);
const postgres = extractConfig(configs.postgres);
const sentry = extractConfig(configs.sentry);
const prometheus = extractConfig(configs.prometheus);
const log = extractConfig(configs.log);
const tracing = extractConfig(configs.tracing);
const hiveServices = extractConfig(configs.hiveServices);
const rateLimit = extractConfig(configs.rateLimit);
const stripe = extractConfig(configs.stripe);

export const env = {
  environment: base.ENVIRONMENT,
  release: base.RELEASE ?? 'local',
  http: {
    port: base.PORT ?? 4012,
  },
  tracing: {
    enabled: !!tracing.OPENTELEMETRY_COLLECTOR_ENDPOINT,
    collectorEndpoint: tracing.OPENTELEMETRY_COLLECTOR_ENDPOINT,
  },
  clickhouse: {
    protocol: clickhouse.CLICKHOUSE_PROTOCOL,
    host: clickhouse.CLICKHOUSE_HOST,
    port: clickhouse.CLICKHOUSE_PORT,
    username: clickhouse.CLICKHOUSE_USERNAME,
    password: clickhouse.CLICKHOUSE_PASSWORD,
  },
  postgres: {
    host: postgres.POSTGRES_HOST,
    port: postgres.POSTGRES_PORT,
    db: postgres.POSTGRES_DB,
    user: postgres.POSTGRES_USER,
    password: postgres.POSTGRES_PASSWORD,
    ssl: postgres.POSTGRES_SSL === '1',
  },
  sentry: sentry.SENTRY === '1' ? { dsn: sentry.SENTRY_DSN } : null,
  log: {
    level: log.LOG_LEVEL ?? 'info',
    requests: log.REQUEST_LOGGING === '1',
  },
  prometheus:
    prometheus.PROMETHEUS_METRICS === '1'
      ? {
          labels: {
            instance: prometheus.PROMETHEUS_METRICS_LABEL_INSTANCE ?? 'rate-limit',
          },
          port: prometheus.PROMETHEUS_METRICS_PORT ?? 10_254,
        }
      : null,
  hiveServices: {
    emails: {
      endpoint: hiveServices.EMAILS_ENDPOINT,
    },
    webAppUrl: hiveServices.WEB_APP_URL,
  },
  rateLimit: {
    limitCacheUpdateIntervalMs: rateLimit.LIMIT_CACHE_UPDATE_INTERVAL_MS ?? 60_000,
  },
  stripe: {
    secretKey: stripe.STRIPE_SECRET_KEY,
    syncIntervalMs: stripe.STRIPE_SYNC_INTERVAL_MS ?? 10 * 60_000,
  },
} as const;
