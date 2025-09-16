import { Config, Output } from '@pulumi/pulumi';
import { ServiceSecret } from '../utils/secrets';

export class DataEncryptionSecret extends ServiceSecret<{
  encryptionPrivateKey: string | Output<string>;
}> {}

export function prepareEnvironment(input: {
  release: string;
  rootDns: string;
  environment: string;
}) {
  const commonConfig = new Config('common');

  const encryptionSecret = new DataEncryptionSecret('data-encryption', {
    encryptionPrivateKey: commonConfig.requireSecret('encryptionSecret'),
  });

  const env =
    input.environment === 'production' || input.environment === 'prod'
      ? 'production'
      : input.environment;

  const appDns = `app.${input.rootDns}`;
  const apiDns = `api.${input.rootDns}`;
  const isProduction = env === 'production';
  const isStaging = env === 'staging';
  const isDev = env === 'dev';

  return {
    envVars: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'debug',
      DEPLOYED_DNS: appDns,
      ENVIRONMENT: input.environment,
      RELEASE: input.release,
    },
    envName: env,
    isProduction,
    isStaging,
    isDev,
    encryptionSecret,
    release: input.release,
    appDns,
    apiDns,
    rootDns: input.rootDns,
    podsConfig: {
      general: {
        replicas: isProduction ? 3 : isStaging ? 2 : 1,
      },
      supertokens: {
        replicas: isProduction ? 3 : 1,
      },
      envoy: {
        replicas: isProduction ? 3 : 1,
        cpuLimit: isProduction ? '800m' : '150m',
        memoryLimit: isProduction ? '1Gi' : '200Mi',
      },
      schemaService: {
        memoryLimit: isProduction ? '2Gi' : '1Gi',
      },
      usageService: {
        replicas: isProduction ? 3 : isStaging ? 2 : 1,
        cpuLimit: isProduction ? '900m' : '300m',
        maxReplicas: isProduction ? 6 : isStaging ? 3 : 1,
        cpuAverageToScale: 60,
      },
      usageIngestorService: {
        replicas: isProduction ? 6 : isStaging ? 2 : 1,
        cpuLimit: isProduction ? '900m' : '300m',
        maxReplicas: isProduction ? /* numberOfPartitions */ 16 : 2,
        cpuAverageToScale: 60,
      },
    },
  };
}

export type Environment = ReturnType<typeof prepareEnvironment>;
