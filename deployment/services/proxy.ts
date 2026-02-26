import * as pulumi from '@pulumi/pulumi';
import { CertManager } from '../utils/cert-manager';
import { Proxy } from '../utils/reverse-proxy';
import { App } from './app';
import { Environment } from './environment';
import { GraphQL } from './graphql';
import { Observability } from './observability';
import { OTELCollector } from './otel-collector';
import { type PublicGraphQLAPIGateway } from './public-graphql-api-gateway';
import { type PublicGraphQLAPIRouter } from './public-graphql-api-router';
import { Usage } from './usage';

export function deployProxy({
  graphql,
  app,
  usage,
  environment,
  observability,
  publicGraphQLAPIGateway,
  publicGraphQLAPIRouter,
  otelCollector,
}: {
  observability: Observability;
  environment: Environment;
  graphql: GraphQL;
  app: App;
  usage: Usage;
  publicGraphQLAPIGateway: PublicGraphQLAPIGateway;
  publicGraphQLAPIRouter: PublicGraphQLAPIRouter;
  otelCollector: OTELCollector;
}) {
  const { tlsIssueName } = new CertManager().deployCertManagerAndIssuer();
  const commonConfig = new pulumi.Config('common');

  return new Proxy(tlsIssueName, {
    address: commonConfig.get('staticIp'),
    aksReservedIpResourceGroup: commonConfig.get('aksReservedIpResourceGroup'),
  })
    .deployProxy({
      envoy: {
        replicas: environment.podsConfig.envoy.replicas,
        cpu: environment.podsConfig.envoy.cpuLimit,
        memory: environment.podsConfig.envoy.memoryLimit,
      },
      tracing: observability.enabled
        ? { collectorService: observability.observability!.otlpCollectorService }
        : undefined,
    })
    .registerService({ record: environment.appDns }, [
      {
        name: 'app',
        path: '/',
        service: app.service,
        requestTimeout: '60s',
      },
      {
        name: 'server',
        path: '/server',
        service: graphql.service,
        requestTimeout: '60s',
      },
      {
        name: 'registry-api-health',
        path: '/registry/_health',
        customRewrite: '/_health',
        service: graphql.service,
      },
      {
        name: 'registry-api',
        path: '/registry',
        customRewrite: '/graphql',
        service: graphql.service,
        requestTimeout: '60s',
        retriable: true,
      },
      {
        name: 'graphql-api',
        path: '/graphql',
        customRewrite: '/graphql',
        service: graphql.service,
        requestTimeout: '60s',
        retriable: true,
      },
      {
        name: 'graphql-api-subscriptions',
        path: '/graphql/stream',
        customRewrite: '/graphql',
        service: graphql.service,
        requestTimeout: 'infinity',
        // we send a ping every 12 seconds
        idleTimeout: '30s',
        retriable: true,
      },
      {
        name: 'auth',
        path: '/auth-api',
        customRewrite: '/auth-api',
        service: graphql.service,
        requestTimeout: '60s',
        retriable: true,
        rateLimit: {
          maxRequests: 10,
          unit: 'minute',
        },
      },
      {
        name: 'usage',
        path: '/usage',
        service: usage.service,
        retriable: true,
      },
    ])
    .registerService({ record: environment.apiDns }, [
      {
        name: 'otel-traces',
        path: '/otel/v1/traces',
        customRewrite: '/v1/traces',
        service: otelCollector.service,
        requestTimeout: '60s',
        retriable: true,
      },
      {
        name: 'public-graphql-api',
        path: '/graphql',
        customRewrite: '/graphql',
        // Here we split traffic between the two services: Hive Gateway and Hive Router
        service: [
          { upstream: publicGraphQLAPIGateway.service, weight: 50 },
          { upstream: publicGraphQLAPIRouter.service, weight: 50 },
        ],
        requestTimeout: '60s',
        retriable: true,
      },
    ]);
}
