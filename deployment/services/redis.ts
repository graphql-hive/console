import * as pulumi from '@pulumi/pulumi';
import { serviceLocalHost } from '../utils/local-endpoint';
import { Redis as RedisStore } from '../utils/redis';
import { ServiceSecret } from '../utils/secrets';
import { Environment } from './environment';

const redisConfig = new pulumi.Config('redis');

export class RedisSecret extends ServiceSecret<{
  password: string | pulumi.Output<string>;
  host: string | pulumi.Output<string>;
  port: string | pulumi.Output<string>;
}> {}

export type Redis = ReturnType<typeof deployRedis>;

export function deployRedis(input: { environment: Environment }) {
  const redisPassword = redisConfig.requireSecret('password');
  const redisApi = new RedisStore({
    password: redisPassword,
  }).deploy({
    limits: input.environment.isProduction
      ? {
          memory: '6Gi',
          cpu: '1000m',
        }
      : {
          memory: '100Mi',
          cpu: '50m',
        },
    args: [
      // When maxmemory is exceeded, the maxmemory-policy is applied.
      // This maxmemory should be 60-70% of the available memory.
      '--maxmemory', input.environment.isProduction ? '2048mb' : '32m',
      // This keeps the most recently used keys. AKA Act like a cache!
      '--maxmemory-policy', 'allkeys-lru',
      // Lazy memory eviction is more performant, but could cause memory
      // to exceed available space if not enough room is given. This is why
      // the 60-70% is crucial.
      '--lazyfree-lazy-eviction', 'yes',
      // This disables snapshotting to save cpu and reduce latency spikes
      '--save', '""',
    ],
  });

  const host = serviceLocalHost(redisApi.service);
  const port = String(redisApi.redisPort);

  const secret = new RedisSecret('redis', {
    password: redisConfig.requireSecret('password'),
    host,
    port,
  });

  return {
    deployment: redisApi.deployment,
    service: redisApi.service,
    secret,
  };
}
