import zod from 'zod';
import {
  extractConfig,
  OpenTelemetryConfigurationModel,
  parseClickHouseConfigFromEnvironment,
  parsePostgresConfigFromEnvironment,
  parseRedisConfigFromEnvironment,
  resolveServerListenOptions,
} from '@hive/service-common';
import { RequestBroker } from './lib/webhooks/send-webhook.js';

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

function raiseInvariant(reason: string): never {
  throw new Error(reason);
}

const EnvironmentModel = zod.object({
  PORT: emptyString(NumberFromString.optional()).default(3014),
  SERVER_HOST: emptyString(zod.string().optional()),
  SERVER_HOST_IPV6_ONLY: emptyString(zod.union([zod.literal('1'), zod.literal('0')]).optional()),
  ENVIRONMENT: emptyString(zod.string().optional()),
  RELEASE: emptyString(zod.string().optional()),
  HEARTBEAT_ENDPOINT: emptyString(zod.url().optional()),
  // Pinged after every successful run of the per-minute metric alert evaluator cron.
  METRIC_ALERTS_HEARTBEAT_ENDPOINT: emptyString(zod.url().optional()),
  EMAIL_FROM: zod.email(),
  SCHEMA_ENDPOINT: zod.url(),
  // Base URL of the Hive Console, used to link alert notifications back to the
  // rule that fired. Optional so an existing self-hosted deployment keeps
  // booting after an upgrade; notifications omit the link when it isn't set.
  WEB_APP_URL: emptyString(zod.url().optional()),
  // Must match the value given to the API service, which is what encrypts
  // `organizations.slack_token`. Optional for the same reason as WEB_APP_URL above;
  // without it, Slack metric-alert notifications are skipped rather than the whole
  // service (all transactional email and crons) failing to boot.
  ENCRYPTION_SECRET: emptyString(zod.string().optional()),
  AWS_REGION: emptyString(zod.string().optional()),
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

const PostmarkEmailModel = zod.object({
  EMAIL_PROVIDER: zod.literal('postmark'),
  EMAIL_PROVIDER_POSTMARK_TOKEN: zod.string(),
  EMAIL_PROVIDER_POSTMARK_MESSAGE_STREAM: zod.string(),
});

const SMTPEmailModel = zod.object({
  EMAIL_PROVIDER: zod.literal('smtp'),
  EMAIL_PROVIDER_SMTP_PROTOCOL: emptyString(
    zod.union([zod.literal('smtp'), zod.literal('smtps')]).optional(),
  ),
  EMAIL_PROVIDER_SMTP_HOST: zod.string(),
  EMAIL_PROVIDER_SMTP_PORT: NumberFromString,
  EMAIL_PROVIDER_SMTP_AUTH_USERNAME: zod.string(),
  EMAIL_PROVIDER_SMTP_AUTH_PASSWORD: zod.string(),
  EMAIL_PROVIDER_SMTP_REJECT_UNAUTHORIZED: emptyString(
    zod.union([zod.literal('0'), zod.literal('1')]).optional(),
  ),
  EMAIL_PROVIDER_SMTP_IGNORE_TLS: emptyString(
    zod.union([zod.literal('0'), zod.literal('1')]).optional(),
  ),
});

const SendmailEmailModel = zod.object({
  EMAIL_PROVIDER: zod.literal('sendmail'),
});

const MockEmailProviderModel = zod.object({
  EMAIL_PROVIDER: zod.literal('mock'),
});

const EmailProviderModel = zod.union([
  PostmarkEmailModel,
  MockEmailProviderModel,
  SMTPEmailModel,
  SendmailEmailModel,
]);

const ClickHouseModel = zod.object({
  CLICKHOUSE: emptyString(zod.union([zod.literal('0'), zod.literal('1')]).optional()),
});

const RequestBrokerModel = zod.union([
  zod.object({
    REQUEST_BROKER: emptyString(zod.literal('0').optional()),
  }),
  zod.object({
    REQUEST_BROKER: zod.literal('1'),
    REQUEST_BROKER_ENDPOINT: zod.string().min(1),
    REQUEST_BROKER_SIGNATURE: zod.string().min(1),
  }),
]);

const PrometheusModel = zod.object({
  PROMETHEUS_METRICS: emptyString(
    zod.union([zod.literal('0'), zod.literal('1')]).optional(),
  ).default('0'),
  PROMETHEUS_METRICS_LABEL_INSTANCE: emptyString(zod.string().optional()).default('workflows'),
  PROMETHEUS_METRICS_PORT: emptyString(NumberFromString.optional()).default(10254),
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
      ])
      .optional(),
  ),
  REQUEST_LOGGING: emptyString(zod.union([zod.literal('0'), zod.literal('1')]).optional()).default(
    '1',
  ),
});

/**
 * Artifact storage (same S3 compatible primary/mirror buckets as the API service).
 * Used for publishing supergraph OCI images. Publishing is disabled when not configured.
 */
const S3Model = zod.object({
  S3_ENDPOINT: emptyString(zod.url().optional()),
  S3_ACCESS_KEY_ID: emptyString(zod.string().optional()),
  S3_SECRET_ACCESS_KEY: emptyString(zod.string().optional()),
  S3_SESSION_TOKEN: emptyString(zod.string().optional()),
  S3_BUCKET_NAME: emptyString(zod.string().optional()),
  S3_AWS_IAM_AUTH_ENABLED: emptyString(zod.union([zod.literal('0'), zod.literal('1')]).optional()),
});

const S3MirrorModel = zod.union([
  zod.object({
    S3_MIRROR: zod.union([zod.literal('0'), zod.literal('')]).optional(),
  }),
  zod.object({
    S3_MIRROR: zod.literal('1'),
    S3_MIRROR_ENDPOINT: zod.url(),
    S3_MIRROR_ACCESS_KEY_ID: emptyString(zod.string().optional()),
    S3_MIRROR_SECRET_ACCESS_KEY: emptyString(zod.string().optional()),
    S3_MIRROR_SESSION_TOKEN: emptyString(zod.string().optional()),
    S3_MIRROR_BUCKET_NAME: zod.string(),
    S3_MIRROR_AWS_IAM_AUTH_ENABLED: emptyString(
      zod.union([zod.literal('0'), zod.literal('1')]).optional(),
    ),
  }),
]);

const configs = {
  base: EnvironmentModel.safeParse(process.env),
  email: EmailProviderModel.safeParse(process.env),
  sentry: SentryModel.safeParse(process.env),
  prometheus: PrometheusModel.safeParse(process.env),
  log: LogModel.safeParse(process.env),
  tracing: OpenTelemetryConfigurationModel.safeParse(process.env),
  clickhouse: ClickHouseModel.safeParse(process.env),
  requestBroker: RequestBrokerModel.safeParse(process.env),
  s3: S3Model.safeParse(process.env),
  s3Mirror: S3MirrorModel.safeParse(process.env),
};

const environmentErrors: Array<string> = [];

for (const config of Object.values(configs)) {
  if (config.success === false) {
    environmentErrors.push(zod.prettifyError(config.error));
  }
}

const redisConfigResult = parseRedisConfigFromEnvironment(
  process.env,
  configs.base.success ? configs.base.data.AWS_REGION : undefined,
);

if (redisConfigResult.type === 'error') {
  environmentErrors.push(...redisConfigResult.errors);
}

const postgresConfigResult = parsePostgresConfigFromEnvironment(
  process.env,
  configs.base.success ? configs.base.data.AWS_REGION : undefined,
);

if (postgresConfigResult.type === 'error') {
  environmentErrors.push(...postgresConfigResult.errors);
}

const clickhouseConfigResult =
  configs.clickhouse.success && configs.clickhouse.data.CLICKHOUSE === '1'
    ? parseClickHouseConfigFromEnvironment(process.env)
    : null;

if (clickhouseConfigResult?.type === 'error') {
  environmentErrors.push(...clickhouseConfigResult.errors);
}

if (configs.s3.success && configs.s3.data.S3_ENDPOINT) {
  const s3 = configs.s3.data;
  const missing: Array<string> = [];
  if (!s3.S3_BUCKET_NAME) missing.push('S3_BUCKET_NAME');
  if (s3.S3_AWS_IAM_AUTH_ENABLED !== '1') {
    if (!s3.S3_ACCESS_KEY_ID) missing.push('S3_ACCESS_KEY_ID');
    if (!s3.S3_SECRET_ACCESS_KEY) missing.push('S3_SECRET_ACCESS_KEY');
  }
  if (missing.length) {
    environmentErrors.push(
      `S3_ENDPOINT is set, but required variables are missing: ${missing.join(', ')}`,
    );
  }
}

if (configs.s3Mirror.success && configs.s3Mirror.data.S3_MIRROR === '1') {
  const mirror = configs.s3Mirror.data;
  if (!configs.s3.success || !configs.s3.data.S3_ENDPOINT) {
    environmentErrors.push('S3_MIRROR=1 requires S3_ENDPOINT to be configured.');
  }
  if (
    mirror.S3_MIRROR_AWS_IAM_AUTH_ENABLED !== '1' &&
    (!mirror.S3_MIRROR_ACCESS_KEY_ID || !mirror.S3_MIRROR_SECRET_ACCESS_KEY)
  ) {
    environmentErrors.push(
      'S3_MIRROR_AWS_IAM_AUTH_ENABLED is not enabled so static credentials are required: S3_MIRROR_ACCESS_KEY_ID, S3_MIRROR_SECRET_ACCESS_KEY',
    );
  }
}

if (environmentErrors.length) {
  const fullError = environmentErrors.join(`\n`);
  console.error('❌ Invalid environment variables:', fullError);
  process.exit(1);
}

const base = extractConfig(configs.base);
const email = extractConfig(configs.email);
const sentry = extractConfig(configs.sentry);
const prometheus = extractConfig(configs.prometheus);
const log = extractConfig(configs.log);
const tracing = extractConfig(configs.tracing);
const clickhouse = extractConfig(configs.clickhouse);
const requestBroker = extractConfig(configs.requestBroker);
const s3 = extractConfig(configs.s3);
const s3Mirror = extractConfig(configs.s3Mirror);

export type S3DestinationConfig = {
  endpoint: string;
  bucketName: string;
  awsIamAuthEnabled: boolean;
  credentials: {
    accessKeyId: string | undefined;
    secretAccessKey: string | undefined;
    sessionToken: string | undefined;
  };
};

const emailProviderConfig =
  email.EMAIL_PROVIDER === 'postmark'
    ? ({
        provider: 'postmark' as const,
        token: email.EMAIL_PROVIDER_POSTMARK_TOKEN,
        messageStream: email.EMAIL_PROVIDER_POSTMARK_MESSAGE_STREAM,
      } as const)
    : email.EMAIL_PROVIDER === 'smtp'
      ? ({
          provider: 'smtp' as const,
          protocol: email.EMAIL_PROVIDER_SMTP_PROTOCOL ?? 'smtp',
          host: email.EMAIL_PROVIDER_SMTP_HOST,
          port: email.EMAIL_PROVIDER_SMTP_PORT,
          auth: {
            user: email.EMAIL_PROVIDER_SMTP_AUTH_USERNAME,
            pass: email.EMAIL_PROVIDER_SMTP_AUTH_PASSWORD,
          },
          tls: {
            rejectUnauthorized: email.EMAIL_PROVIDER_SMTP_REJECT_UNAUTHORIZED !== '0',
          },
          // Opt-in, unlike `rejectUnauthorized` above: an unset variable must keep
          // STARTTLS enabled for existing deployments.
          ignoreTLS: email.EMAIL_PROVIDER_SMTP_IGNORE_TLS === '1',
        } as const)
      : email.EMAIL_PROVIDER === 'sendmail'
        ? ({ provider: 'sendmail' } as const)
        : ({ provider: 'mock' } as const);

export type EmailProviderConfig = typeof emailProviderConfig;
export type PostmarkEmailProviderConfig = Extract<EmailProviderConfig, { provider: 'postmark' }>;
export type SMTPEmailProviderConfig = Extract<EmailProviderConfig, { provider: 'smtp' }>;
export type SendmailEmailProviderConfig = Extract<EmailProviderConfig, { provider: 'sendmail' }>;
export type MockEmailProviderConfig = Extract<EmailProviderConfig, { provider: 'mock' }>;

export const env = {
  environment: base.ENVIRONMENT,
  release: base.RELEASE ?? 'local',
  http: {
    port: base.PORT,
    ...resolveServerListenOptions({
      serverHost: base.SERVER_HOST,
      serverHostIpv6Only: base.SERVER_HOST_IPV6_ONLY,
    }),
  },
  tracing: {
    enabled: !!tracing.OPENTELEMETRY_COLLECTOR_ENDPOINT,
    collectorEndpoint: tracing.OPENTELEMETRY_COLLECTOR_ENDPOINT,
  },
  email: {
    provider: emailProviderConfig,
    emailFrom: base.EMAIL_FROM,
  },
  schema: {
    serviceUrl: base.SCHEMA_ENDPOINT,
  },
  // Trailing slash stripped so callers can append `/${slug}` paths. Deployment
  // configs are inconsistent about it (deployment/services/commerce.ts sets the
  // same variable with a trailing slash).
  webAppUrl: base.WEB_APP_URL?.replace(/\/$/, '') ?? null,
  encryptionSecret: base.ENCRYPTION_SECRET ?? null,
  sentry: sentry.SENTRY === '1' ? { dsn: sentry.SENTRY_DSN } : null,
  log: {
    level: log.LOG_LEVEL ?? 'info',
  },
  prometheus:
    prometheus.PROMETHEUS_METRICS === '1'
      ? {
          labels: {
            instance: prometheus.PROMETHEUS_METRICS_LABEL_INSTANCE,
          },
          port: prometheus.PROMETHEUS_METRICS_PORT,
        }
      : null,
  postgres:
    postgresConfigResult?.type === 'ok'
      ? postgresConfigResult.config
      : raiseInvariant('Unreachable: postgres config errors are caught above via process.exit(1)'),
  clickhouse:
    clickhouse.CLICKHOUSE === '1'
      ? clickhouseConfigResult?.type === 'ok'
        ? clickhouseConfigResult.config
        : raiseInvariant(
            'Unreachable: ClickHouse config errors are caught above via process.exit(1)',
          )
      : null,
  requestBroker:
    requestBroker.REQUEST_BROKER === '1'
      ? ({
          endpoint: requestBroker.REQUEST_BROKER_ENDPOINT,
          signature: requestBroker.REQUEST_BROKER_SIGNATURE,
        } satisfies RequestBroker)
      : null,
  s3:
    s3.S3_ENDPOINT && s3.S3_BUCKET_NAME
      ? ({
          endpoint: s3.S3_ENDPOINT,
          bucketName: s3.S3_BUCKET_NAME,
          awsIamAuthEnabled: s3.S3_AWS_IAM_AUTH_ENABLED === '1',
          credentials: {
            accessKeyId: s3.S3_ACCESS_KEY_ID,
            secretAccessKey: s3.S3_SECRET_ACCESS_KEY,
            sessionToken: s3.S3_SESSION_TOKEN,
          },
        } satisfies S3DestinationConfig)
      : null,
  s3Mirror:
    s3Mirror.S3_MIRROR === '1'
      ? ({
          endpoint: s3Mirror.S3_MIRROR_ENDPOINT,
          bucketName: s3Mirror.S3_MIRROR_BUCKET_NAME,
          awsIamAuthEnabled: s3Mirror.S3_MIRROR_AWS_IAM_AUTH_ENABLED === '1',
          credentials: {
            accessKeyId: s3Mirror.S3_MIRROR_ACCESS_KEY_ID,
            secretAccessKey: s3Mirror.S3_MIRROR_SECRET_ACCESS_KEY,
            sessionToken: s3Mirror.S3_MIRROR_SESSION_TOKEN,
          },
        } satisfies S3DestinationConfig)
      : null,
  httpHeartbeat: base.HEARTBEAT_ENDPOINT ? { endpoint: base.HEARTBEAT_ENDPOINT } : null,
  metricAlertsHeartbeat: base.METRIC_ALERTS_HEARTBEAT_ENDPOINT
    ? { endpoint: base.METRIC_ALERTS_HEARTBEAT_ENDPOINT }
    : null,
  redis:
    redisConfigResult?.type === 'ok'
      ? redisConfigResult.config
      : raiseInvariant('Unreachable: redis config errors are caught above via process.exit(1)'),
} as const;
