import * as pulumi from '@pulumi/pulumi';
import { CertManager } from '../utils/cert-manager';
import { Proxy } from '../utils/reverse-proxy';
import { App } from './app';
import { Environment } from './environment';
import { GraphQL } from './graphql';
import { Usage } from './usage';

export function deployProxy({
  graphql,
  app,
  usage,
  environment,
}: {
  environment: Environment;
  graphql: GraphQL;
  app: App;
  usage: Usage;
}) {
  const { tlsIssueName } = new CertManager().deployCertManagerAndIssuer();
  const commonConfig = new pulumi.Config('common');

  return new Proxy(tlsIssueName, {
    address: commonConfig.get('staticIp'),
    aksReservedIpResourceGroup: commonConfig.get('aksReservedIpResourceGroup'),
  })
    .deployProxy({
      envoy: {
        replicas: environment.isProduction ? 3 : 1,
        cpu: environment.isProduction ? '800m' : '150m',
        memory: environment.isProduction ? '800Mi' : '192Mi',
      },
    })
    .registerService({ record: environment.appDns }, [
      {
        name: 'app',
        path: '/',
        service: app.service,
        timeoutInSeconds: 60,
      },
      {
        name: 'server',
        path: '/server',
        service: graphql.service,
        timeoutInSeconds: 60,
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
        timeoutInSeconds: 60,
        retriable: true,
      },
      {
        name: 'graphql-api',
        path: '/graphql',
        customRewrite: '/graphql',
        service: graphql.service,
        timeoutInSeconds: 60,
        retriable: true,
      },
      {
        name: 'usage',
        path: '/usage',
        service: usage.service,
        retriable: true,
      },
    ])
    .get();
}
