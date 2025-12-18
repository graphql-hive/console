import * as pulumi from '@pulumi/pulumi';
import { serviceLocalEndpoint } from '../utils/local-endpoint';
import { ServiceSecret } from '../utils/secrets';
import { ServiceDeployment } from '../utils/service-deployment';
import { Docker } from './docker';
import { Environment } from './environment';
import { Observability } from './observability';
import { Redis } from './redis';
import { Sentry } from './sentry';
import { PostmarkSecret } from './workflows';

export type Emails = ReturnType<typeof deployEmails>;

export function deployEmails({
  environment,
  redis,
  heartbeat,
  image,
  docker,
  sentry,
  observability,
  postmarkSecret,
}: {
  observability: Observability;
  environment: Environment;
  image: string;
  redis: Redis;
  docker: Docker;
  postmarkSecret: PostmarkSecret;
  heartbeat?: string;
  sentry: Sentry;
}) {
  const { deployment, service } = new ServiceDeployment(
    'emails-service',
    {
      imagePullSecret: docker.secret,
      env: {
        ...environment.envVars,
        SENTRY: sentry.enabled ? '1' : '0',
        EMAIL_PROVIDER: 'postmark',
        HEARTBEAT_ENDPOINT: heartbeat ?? '',
        OPENTELEMETRY_COLLECTOR_ENDPOINT:
          observability.enabled && observability.tracingEndpoint
            ? observability.tracingEndpoint
            : '',
      },
      readinessProbe: '/_readiness',
      livenessProbe: '/_health',
      startupProbe: '/_health',
      exposesMetrics: true,
      image,
      replicas: environment.podsConfig.general.replicas,
    },
    [redis.deployment, redis.service],
  )
    .withSecret('REDIS_HOST', redis.secret, 'host')
    .withSecret('REDIS_PORT', redis.secret, 'port')
    .withSecret('REDIS_PASSWORD', redis.secret, 'password')
    .withSecret('EMAIL_FROM', postmarkSecret, 'from')
    .withSecret('EMAIL_PROVIDER_POSTMARK_TOKEN', postmarkSecret, 'token')
    .withSecret('EMAIL_PROVIDER_POSTMARK_MESSAGE_STREAM', postmarkSecret, 'messageStream')
    .withConditionalSecret(sentry.enabled, 'SENTRY_DSN', sentry.secret, 'dsn')
    .deploy();

  return { deployment, service, localEndpoint: serviceLocalEndpoint(service) };
}
