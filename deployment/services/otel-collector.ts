import { serviceLocalEndpoint } from '../utils/local-endpoint';
import { ServiceDeployment } from '../utils/service-deployment';
import { Clickhouse } from './clickhouse';
import { DbMigrations } from './db-migrations';
import { Docker } from './docker';
import { Environment } from './environment';
import { GraphQL } from './graphql';
import { Redpanda } from './redpanda';

export type OTELCollector = ReturnType<typeof deployOTELCollector>;

export function deployOTELCollector(args: {
  image: string;
  environment: Environment;
  docker: Docker;
  clickhouse: Clickhouse;
  dbMigrations: DbMigrations;
  graphql: GraphQL;
  redpanda: Redpanda;
}) {
  const kafkaBroker = args.redpanda.brokerEndpoint;

  const ingress = new ServiceDeployment(
    'otel-collector-ingress',
    {
      image: args.image,
      imagePullSecret: args.docker.secret,
      env: {
        ...args.environment.envVars,
        HIVE_OTEL_AUTH_ENDPOINT: serviceLocalEndpoint(args.graphql.service).apply(
          value => value + '/otel-auth',
        ),
        KAFKA_BROKER: kafkaBroker,
      },
      /**
       * We are using the healthcheck extension.
       * https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/healthcheckextension
       */
      probePort: 13133,
      readinessProbe: '/',
      livenessProbe: '/',
      startupProbe: '/',
      exposesMetrics: true,
      replicas: args.environment.podsConfig.tracingCollector.maxReplicas,
      pdb: true,
      availabilityOnEveryNode: true,
      port: 4318,
      memoryLimit: args.environment.podsConfig.tracingCollector.memoryLimit,
      autoScaling: {
        maxReplicas: args.environment.podsConfig.tracingCollector.maxReplicas,
        cpu: {
          limit: '500m',
          cpuAverageToScale: 80,
        },
      },
    },
    [args.dbMigrations],
  ).deploy();

  // Egress: Redpanda -> ClickHouse
  const egress = new ServiceDeployment(
    'otel-collector-egress',
    {
      image: args.image,
      imagePullSecret: args.docker.secret,
      env: {
        ...args.environment.envVars,
        KAFKA_BROKER: kafkaBroker,
      },
      probePort: 13133,
      readinessProbe: '/',
      livenessProbe: '/',
      startupProbe: '/',
      exposesMetrics: true,
      replicas: args.environment.podsConfig.tracingCollector.maxReplicas,
      pdb: true,
      memoryLimit: args.environment.podsConfig.tracingCollector.memoryLimit,
      autoScaling: {
        maxReplicas: args.environment.podsConfig.tracingCollector.maxReplicas,
        cpu: {
          limit: '500m',
          cpuAverageToScale: 80,
        },
      },
    },
    [args.clickhouse.deployment, args.clickhouse.service, args.dbMigrations],
  )
    .withSecret('CLICKHOUSE_HOST', args.clickhouse.secret, 'host')
    .withSecret('CLICKHOUSE_PORT', args.clickhouse.secret, 'port')
    .withSecret('CLICKHOUSE_USERNAME', args.clickhouse.secret, 'username')
    .withSecret('CLICKHOUSE_PASSWORD', args.clickhouse.secret, 'password')
    .withSecret('CLICKHOUSE_PROTOCOL', args.clickhouse.secret, 'protocol')
    .deploy();

  return {
    ingress,
    egress,
    // For backward compatibility, expose ingress as the main deployment
    deployment: ingress.deployment,
    service: ingress.service,
  };
}
