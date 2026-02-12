import * as fs from 'fs';
import * as path from 'path';
import * as kx from '@pulumi/kubernetesx';
import * as pulumi from '@pulumi/pulumi';
import { serviceLocalEndpoint } from '../utils/local-endpoint';
import { ServiceSecret } from '../utils/secrets';
import { ServiceDeployment } from '../utils/service-deployment';
import { type Docker } from './docker';
import { type Environment } from './environment';
import { type GraphQL } from './graphql';
import { type Observability } from './observability';
import { type OTELCollector } from './otel-collector';

/**
 * Hive Router Docker Image Version
 */
const dockerImage = 'ghcr.io/graphql-hive/router:0.0.39';
const configDirectory = path.resolve(__dirname, '..', 'config', 'public-graphql-api');

// On global scope to fail early in case of a read error
const configPath = path.join(configDirectory, 'router.config.yaml');
const routerConfigFile = fs.readFileSync(configPath, 'utf-8');

export function deployPublicGraphQLAPIRouter(args: {
  environment: Environment;
  graphql: GraphQL;
  docker: Docker;
  observability: Observability;
  otelCollector: OTELCollector;
}) {
  const apiConfig = new pulumi.Config('api');

  // Note: The persisted documents cdn endpoint can also be used for reading the contract schema
  const cdnEndpoint =
    apiConfig.requireObject<Record<string, string>>('env')['HIVE_PERSISTED_DOCUMENTS_CDN_ENDPOINT'];

  if (!cdnEndpoint) {
    throw new Error("Missing cdn endpoint variable 'HIVE_PERSISTED_DOCUMENTS_CDN_ENDPOINT'.");
  }

  const hiveConfig = new pulumi.Config('hive');
  const hiveConfigSecrets = new ServiceSecret('hive-router-tracing-secret', {
    otelTraceAccessToken: hiveConfig.requireSecret('otelTraceAccessToken'),
  });

  const supergraphEndpoint = cdnEndpoint + '/contracts/public';

  // Note: The persisted documents access key is also valid for reading the supergraph
  const publicGraphQLAPISecret = new ServiceSecret('public-graphql-api-router-secret', {
    cdnAccessKeyId: apiConfig.requireSecret('hivePersistedDocumentsCdnAccessKeyId'),
  });

  const routerConfigDirAbsolutePath = '/config/';
  const routerConfigFileName = 'router.yaml';

  const configMap = new kx.ConfigMap('public-graphql-api-router-config', {
    data: {
      [routerConfigFileName]: routerConfigFile,
    },
  });

  const mountName = 'router-config';

  return new ServiceDeployment(
    'public-graphql-api-router',
    {
      imagePullSecret: args.docker.secret,
      image: dockerImage,
      replicas: args.environment.podsConfig.general.replicas,
      availabilityOnEveryNode: true,
      env: {
        ROUTER_CONFIG_FILE_PATH: `${routerConfigDirAbsolutePath}${routerConfigFileName}`,
        INTERNAL_GRAPHQL_URL: serviceLocalEndpoint(args.graphql.service).apply(
          value => `${value}/graphql-public`,
        ),
        HIVE_CDN_ENDPOINT: supergraphEndpoint,
        HIVE_TARGET: hiveConfig.require('target'),
        OPENTELEMETRY_COLLECTOR_ENDPOINT: args.observability.tracingEndpoint ?? '',
        HIVE_TRACE_ENDPOINT: serviceLocalEndpoint(args.otelCollector.service).apply(
          value => `${value}/v1/traces`,
        ),
      },
      port: 4000,
      volumes: [
        {
          name: mountName,
          configMap: {
            name: configMap.metadata.name,
          },
        },
      ],
      volumeMounts: [
        {
          mountPath: routerConfigDirAbsolutePath,
          name: mountName,
          readOnly: true,
        },
      ],
      readinessProbe: '/readiness',
      livenessProbe: '/health',
      startupProbe: {
        endpoint: '/health',
        initialDelaySeconds: 60,
        failureThreshold: 10,
        periodSeconds: 15,
        timeoutSeconds: 15,
      },
    },
    [args.graphql.deployment, args.graphql.service],
  )
    .withSecret('HIVE_CDN_KEY', publicGraphQLAPISecret, 'cdnAccessKeyId')
    .withSecret('HIVE_ACCESS_TOKEN', hiveConfigSecrets, 'otelTraceAccessToken')
    .deploy();
}

export type PublicGraphQLAPIRouter = ReturnType<typeof deployPublicGraphQLAPIRouter>;
