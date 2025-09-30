import { serviceLocalEndpoint } from '../utils/local-endpoint';
import { ServiceDeployment } from '../utils/service-deployment';
import { CommerceService } from './commerce';
import { DbMigrations } from './db-migrations';
import { Docker } from './docker';
import { Environment } from './environment';
import { Kafka } from './kafka';
import { Observability } from './observability';
import { Postgres } from './postgres';
import { Redis } from './redis';
import { Sentry } from './sentry';
import { Tokens } from './tokens';

export type Usage = ReturnType<typeof deployUsage>;

export function deployUsage({
  environment,
  tokens,
  postgres,
  redis,
  kafka,
  dbMigrations,
  commerce,
  image,
  docker,
  observability,
  sentry,
}: {
  observability: Observability;
  image: string;
  environment: Environment;
  tokens: Tokens;
  postgres: Postgres;
  redis: Redis;
  kafka: Kafka;
  dbMigrations: DbMigrations;
  commerce: CommerceService;
  docker: Docker;
  sentry: Sentry;
}) {
  const kafkaBufferDynamic =
    kafka.config.bufferDynamic === 'true' || kafka.config.bufferDynamic === '1' ? '1' : '0';

  return (
    new ServiceDeployment(
      'usage-service',
      {
        image,
        imagePullSecret: docker.secret,
        replicas: environment.podsConfig.usageService.replicas,
        readinessProbe: {
          initialDelaySeconds: 10,
          periodSeconds: 5,
          failureThreshold: 1,
          timeoutSeconds: 5,
          endpoint: '/_readiness',
        },
        livenessProbe: '/_health',
        startupProbe: '/_health',
        availabilityOnEveryNode: true,
        env: {
          ...environment.envVars,
          SENTRY: sentry.enabled ? '1' : '0',
          REQUEST_LOGGING: '0',
          KAFKA_BUFFER_SIZE: kafka.config.bufferSize,
          KAFKA_SASL_MECHANISM: kafka.config.saslMechanism,
          KAFKA_CONCURRENCY: kafka.config.concurrency,
          KAFKA_BUFFER_INTERVAL: kafka.config.bufferInterval,
          KAFKA_BUFFER_DYNAMIC: kafkaBufferDynamic,
          KAFKA_TOPIC: kafka.config.topic,
          TOKENS_ENDPOINT: serviceLocalEndpoint(tokens.service),
          COMMERCE_ENDPOINT: serviceLocalEndpoint(commerce.service),
          OPENTELEMETRY_COLLECTOR_ENDPOINT:
            observability.enabled &&
            observability.enabledForUsageService &&
            observability.tracingEndpoint
              ? observability.tracingEndpoint
              : '',
        },
        exposesMetrics: true,
        port: 4000,
        pdb: true,
        autoScaling: {
          cpu: {
            cpuAverageToScale: environment.podsConfig.usageService.cpuAverageToScale,
            limit: environment.podsConfig.usageService.cpuLimit,
          },
          maxReplicas: environment.podsConfig.usageService.maxReplicas,
        },
      },
      [
        dbMigrations,
        tokens.deployment,
        tokens.service,
        commerce.deployment,
        commerce.service,
      ].filter(Boolean),
    )
      // Redis
      .withSecret('REDIS_HOST', redis.secret, 'host')
      .withSecret('REDIS_PORT', redis.secret, 'port')
      .withSecret('REDIS_PASSWORD', redis.secret, 'password')
      // PG
      .withSecret('POSTGRES_HOST', postgres.pgBouncerSecret, 'host')
      .withSecret('POSTGRES_PORT', postgres.pgBouncerSecret, 'port')
      .withSecret('POSTGRES_USER', postgres.pgBouncerSecret, 'user')
      .withSecret('POSTGRES_PASSWORD', postgres.pgBouncerSecret, 'password')
      .withSecret('POSTGRES_DB', postgres.pgBouncerSecret, 'database')
      .withSecret('POSTGRES_SSL', postgres.pgBouncerSecret, 'ssl')
      // Kafka
      .withSecret('KAFKA_SASL_USERNAME', kafka.secret, 'saslUsername')
      .withSecret('KAFKA_SASL_PASSWORD', kafka.secret, 'saslPassword')
      .withSecret('KAFKA_SSL', kafka.secret, 'ssl')
      .withSecret('KAFKA_BROKER', kafka.secret, 'endpoint')
      .withConditionalSecret(sentry.enabled, 'SENTRY_DSN', sentry.secret, 'dsn')
      .deploy()
  );
}
