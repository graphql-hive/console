import * as pulumi from '@pulumi/pulumi';
import { CloudflareBroker } from '../utils/cloudflare';
import { ServiceSecret } from '../utils/secrets';
import { Environment } from './environment';
import { Sentry } from './sentry';

export class CloudFlareBrokerSecret extends ServiceSecret<{
  secretSignature: string | pulumi.Output<string>;
  baseUrl: string | pulumi.Output<string>;
}> {}

export type Broker = ReturnType<typeof deployCFBroker>;

export function deployCFBroker({
  environment,
  sentry,
}: {
  environment: Environment;
  sentry: Sentry;
}) {
  const commonConfig = new pulumi.Config('common');
  const cfConfig = new pulumi.Config('cloudflareCustom');
  const observabilityConfig = new pulumi.Config('observability');

  const cfBrokerSignature = commonConfig.requireSecret('cfBrokerSignature');
  const broker = new CloudflareBroker({
    envName: environment.envName,
    zoneId: cfConfig.require('zoneId'),
    cdnDnsRecord: `broker.${environment.rootDns}`,
    secretSignature: cfBrokerSignature,
    sentryDsn: sentry.enabled && sentry.secret ? sentry.secret.raw.dsn : '',
    release: environment.release,
    loki: observabilityConfig.getBoolean('enabled')
      ? observabilityConfig.getBoolean('local')
        ? null
        : {
            endpoint: observabilityConfig.require('lokiEndpoint'),
            username: observabilityConfig.require('lokiUsername'),
            password: observabilityConfig.requireSecret('lokiPassword'),
          }
      : null,
  });

  const deployedBroker = broker.deploy();

  const secret = new CloudFlareBrokerSecret('cloudflare-broker', {
    secretSignature: cfBrokerSignature,
    baseUrl: deployedBroker.workerBaseUrl,
  });

  return {
    broker: deployedBroker,
    secret,
  };
}
