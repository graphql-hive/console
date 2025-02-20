import * as pulumi from '@pulumi/pulumi';
import { serviceLocalEndpoint } from '../utils/local-endpoint';
import { ServiceDeployment } from '../utils/service-deployment';
import { CommerceService } from './commerce';
import { DbMigrations } from './db-migrations';
import { Docker } from './docker';
import { Environment } from './environment';
import { Kafka } from './kafka';
import { Observability } from './observability';
import { Sentry } from './sentry';
import { Tokens } from './tokens';

export type Usage = ReturnType<typeof deployUsage>;

export function deployUsage({
  environment,
  tokens,
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
  kafka: Kafka;
  dbMigrations: DbMigrations;
  commerce: CommerceService;
  docker: Docker;
  sentry: Sentry;
}) {
  const replicas = environment.isProduction ? 3 : 1;
  const cpuLimit = environment.isProduction ? '600m' : '300m';
  const maxReplicas = environment.isProduction ? 6 : 2;
  const kafkaBufferDynamic =
    kafka.config.bufferDynamic === 'true' || kafka.config.bufferDynamic === '1' ? '1' : '0';

  return new ServiceDeployment(
    'usage-service',
    {
      image,
      imagePullSecret: docker.secret,
      replicas,
      readinessProbe: {
        initialDelaySeconds: 10,
        periodSeconds: 5,
        failureThreshold: 2,
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
          cpuAverageToScale: 60,
          limit: cpuLimit,
        },
        maxReplicas,
      },
    },
    [dbMigrations, tokens.deployment, tokens.service, commerce.deployment, commerce.service].filter(
      Boolean,
    ),
  )
    .withSecret('KAFKA_SASL_USERNAME', kafka.secret, 'saslUsername')
    .withSecret('KAFKA_SASL_PASSWORD', kafka.secret, 'saslPassword')
    .withSecret('KAFKA_SSL', kafka.secret, 'ssl')
    .withSecret('KAFKA_BROKER', kafka.secret, 'endpoint')
    .withConditionalSecret(sentry.enabled, 'SENTRY_DSN', sentry.secret, 'dsn')
    .deploy();
}
