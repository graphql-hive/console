import zod from 'zod';

const isNumberString = (input: unknown) => zod.string().regex(/^\d+$/).safeParse(input).success;

const numberFromNumberOrNumberString = (input: unknown): number | undefined => {
  if (typeof input == 'number') return input;
  if (isNumberString(input)) return Number(input);
};

const NumberFromString = zod.preprocess(numberFromNumberOrNumberString, zod.number().min(1));

const EnvironmentModel = zod.object({
  PORT: NumberFromString.optional(),
  ENVIRONMENT: zod.string().optional(),
  RELEASE: zod.string().optional(),
  HEARTBEAT_ENDPOINT: zod.string().url().optional(),
  USAGE_ESTIMATOR_ENDPOINT: zod.string().url(),
});

const SentryModel = zod.union([
  zod.object({
    SENTRY: zod.literal('0').optional(),
  }),
  zod.object({
    SENTRY: zod.literal('1'),
    SENTRY_DSN: zod.string(),
  }),
]);

const PostgresModel = zod.object({
  POSTGRES_HOST: zod.string(),
  POSTGRES_PORT: NumberFromString,
  POSTGRES_PASSWORD: zod.string(),
  POSTGRES_USER: zod.string(),
  POSTGRES_DB: zod.string(),
  POSTGRES_ENABLE_SSL: zod.union([zod.literal('1'), zod.literal('0')]).optional(),
});

const StripeModel = zod.object({
  STRIPE_SECRET_KEY: zod.string(),
  STRIPE_SYNC_INTERVAL_MS: NumberFromString.optional(),
});

const PrometheusModel = zod.object({
  PROMETHEUS_METRICS: zod.union([zod.literal('0'), zod.literal('1')]).optional(),
  PROMETHEUS_METRICS_LABEL_INSTANCE: zod.string().optional(),
});

const configs = {
  // eslint-disable-next-line no-process-env
  base: EnvironmentModel.safeParse(process.env),
  // eslint-disable-next-line no-process-env
  sentry: SentryModel.safeParse(process.env),
  // eslint-disable-next-line no-process-env
  postgres: PostgresModel.safeParse(process.env),
  // eslint-disable-next-line no-process-env
  stripe: StripeModel.safeParse(process.env),
  // eslint-disable-next-line no-process-env
  prometheus: PrometheusModel.safeParse(process.env),
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
const postgres = extractConfig(configs.postgres);
const sentry = extractConfig(configs.sentry);
const prometheus = extractConfig(configs.prometheus);
const stripe = extractConfig(configs.stripe);

export const env = {
  environment: base.ENVIRONMENT,
  release: base.RELEASE ?? 'local',
  http: {
    port: base.PORT ?? 4013,
  },
  hiveServices: {
    usageEstimator: {
      endpoint: base.USAGE_ESTIMATOR_ENDPOINT,
    },
  },
  postgres: {
    host: postgres.POSTGRES_HOST,
    port: postgres.POSTGRES_PORT,
    db: postgres.POSTGRES_DB,
    user: postgres.POSTGRES_USER,
    password: postgres.POSTGRES_PASSWORD,
    ssl: postgres.POSTGRES_ENABLE_SSL === '1',
  },
  stripe: {
    secretKey: stripe.STRIPE_SECRET_KEY,
    syncIntervalMs: stripe.STRIPE_SYNC_INTERVAL_MS ?? 10 * 60_000,
  },
  heartbeat: base.HEARTBEAT_ENDPOINT ? { endpoint: base.HEARTBEAT_ENDPOINT } : null,
  sentry: sentry.SENTRY === '1' ? { dsn: sentry.SENTRY_DSN } : null,
  prometheus:
    prometheus.PROMETHEUS_METRICS === '1'
      ? {
          labels: {
            instance: prometheus.PROMETHEUS_METRICS_LABEL_INSTANCE ?? 'usage-service',
          },
        }
      : null,
} as const;
