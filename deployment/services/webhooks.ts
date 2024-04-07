import { ServiceDeployment } from '../utils/service-deployment';
import type { Broker } from './cf-broker';
import { Docker } from './docker';
import { Environment } from './environment';
import { Observability } from './observability';
import { Redis } from './redis';
import { Sentry } from './sentry';

export type Webhooks = ReturnType<typeof deployWebhooks>;

export function deployWebhooks({
  environment,
  heartbeat,
  broker,
  image,
  docker,
  redis,
  sentry,
  observability,
}: {
  observability: Observability;
  image: string;
  environment: Environment;
  heartbeat?: string;
  docker: Docker;
  broker: Broker;
  redis: Redis;
  sentry: Sentry;
}) {
  return new ServiceDeployment(
    'webhooks-service',
    {
      imagePullSecret: docker.secret,
      env: {
        ...environment.envVars,
        SENTRY: sentry.enabled ? '1' : '0',
        HEARTBEAT_ENDPOINT: heartbeat ?? '',
        REQUEST_BROKER: '1',
        OPENTELEMETRY_COLLECTOR_ENDPOINT:
          observability.enabled && observability.tracingEndpoint
            ? observability.tracingEndpoint
            : '',
      },
      readinessProbe: '/_readiness',
      livenessProbe: '/_health',
      startupProbe: '/_health',
      exposesMetrics: true,
      replicas: environment.isProduction ? 3 : 1,
      image,
    },
    [redis.deployment, redis.service],
  )
    .withSecret('REDIS_HOST', redis.secret, 'host')
    .withSecret('REDIS_PORT', redis.secret, 'port')
    .withSecret('REDIS_PASSWORD', redis.secret, 'password')
    .withSecret('REQUEST_BROKER_ENDPOINT', broker.secret, 'baseUrl')
    .withSecret('REQUEST_BROKER_SIGNATURE', broker.secret, 'secretSignature')
    .withConditionalSecret(sentry.enabled, 'SENTRY_DSN', sentry.secret, 'dsn')
    .deploy();
}
