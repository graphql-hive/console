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

/**
 * Hive Gateway Docker Image Version
 * Bump this to update the used gateway version.
 */
const dockerImage = 'ghcr.io/graphql-hive/gateway:2.1.7';

const gatewayConfigDirectory = path.resolve(
  __dirname,
  '..',
  'config',
  'public-graphql-api-gateway',
);

// On global scope to fail early in case of a read error
const gatewayConfigPath = path.join(gatewayConfigDirectory, 'gateway.config.ts');
const gwConfigFile = fs.readFileSync(gatewayConfigPath, 'utf-8');

export function deployPublicGraphQLAPIGateway(args: {
  environment: Environment;
  graphql: GraphQL;
  docker: Docker;
  observability: Observability;
}) {
  const apiConfig = new pulumi.Config('api');

  // Note: The persisted documents cdn endpoint can also be used for reading the contract schema
  const cdnEndpoint =
    apiConfig.requireObject<Record<string, string>>('env')['HIVE_PERSISTED_DOCUMENTS_CDN_ENDPOINT'];

  if (!cdnEndpoint) {
    throw new Error("Missing cdn endpoint variable 'HIVE_PERSISTED_DOCUMENTS_CDN_ENDPOINT'.");
  }

  const supergraphEndpoint = cdnEndpoint + '/contracts/public';

  // Note: The persisted documents access key is also valid for reading the supergraph
  const publicGraphQLAPISecret = new ServiceSecret('public-graphql-api-secret', {
    cdnAccessKeyId: apiConfig.requireSecret('hivePersistedDocumentsCdnAccessKeyId'),
  });

  const configMap = new kx.ConfigMap('public-graphql-api-gateway-config', {
    data: {
      'gateway.config.ts': gwConfigFile,
    },
  });

  return new ServiceDeployment(
    'public-graphql-api-gateway',
    {
      imagePullSecret: args.docker.secret,
      image: dockerImage,
      replicas: args.environment.podsConfig.general.replicas,
      availabilityOnEveryNode: true,
      env: {
        GRAPHQL_SERVICE_ENDPOINT: serviceLocalEndpoint(args.graphql.service).apply(
          value => `${value}/graphql-public`,
        ),
        SUPERGRAPH_ENDPOINT: supergraphEndpoint,
        OPENTELEMETRY_COLLECTOR_ENDPOINT: args.observability.tracingEndpoint ?? '',
      },
      port: 4000,
      args: ['-c', '/config/gateway.config.ts', 'supergraph'],
      volumes: [
        {
          name: 'gateway-config',
          configMap: {
            name: configMap.metadata.name,
          },
        },
      ],
      volumeMounts: [
        {
          mountPath: '/config/',
          name: 'gateway-config',
          readOnly: true,
        },
      ],
      readinessProbe: '/readiness',
      livenessProbe: '/healthcheck',
      startupProbe: {
        endpoint: '/healthcheck',
        initialDelaySeconds: 60,
        failureThreshold: 10,
        periodSeconds: 15,
        timeoutSeconds: 15,
      },
    },
    [args.graphql.deployment, args.graphql.service],
  )
    .withSecret('HIVE_CDN_ACCESS_TOKEN', publicGraphQLAPISecret, 'cdnAccessKeyId')
    .deploy();
}

export type PublicGraphQLAPIGateway = ReturnType<typeof deployPublicGraphQLAPIGateway>;
