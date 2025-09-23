import { serviceLocalEndpoint } from '../utils/local-endpoint';
import { ServiceDeployment } from '../utils/service-deployment';
import { Clickhouse } from './clickhouse';
import { DbMigrations } from './db-migrations';
import { Docker } from './docker';
import { Environment } from './environment';
import { GraphQL } from './graphql';

export type OTELCollector = ReturnType<typeof deployOTELCollector>;

export function deployOTELCollector(args: {
  image: string;
  environment: Environment;
  docker: Docker;
  clickhouse: Clickhouse;
  dbMigrations: DbMigrations;
  graphql: GraphQL;
}) {
  return new ServiceDeployment(
    'otel-collector',
    {
      image: args.image,
      imagePullSecret: args.docker.secret,
      env: {
        ...args.environment.envVars,
        HIVE_OTEL_AUTH_ENDPOINT: serviceLocalEndpoint(args.graphql.service).apply(
          value => value + '/otel-auth',
        ),
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
      replicas: args.environment.isProduction ? 3 : 1,
      pdb: true,
      availabilityOnEveryNode: true,
      port: 4318,
      memoryLimit: args.environment.podsConfig.tracingCollector.memoryLimit,
      autoScaling: {
        maxReplicas: args.environment.podsConfig.tracingCollector.maxReplicas,
        cpu: {
          limit: args.environment.podsConfig.tracingCollector.cpuLimit,
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
}
