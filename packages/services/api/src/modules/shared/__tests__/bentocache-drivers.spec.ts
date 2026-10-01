import Redis from 'ioredis-mock';
import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/drivers/memory';
import { redisDriver } from 'bentocache/drivers/redis';

// The cache providers import the drivers from these public sub-paths. The package-internal
// paths they replaced only fail at runtime inside a bundled service, so pin the public ones here.
it('builds a memory + redis store from the public driver sub-paths', async ({ expect }) => {
  const cache = new BentoCache({
    default: 'spec',
    stores: {
      spec: bentostore({ prefix: 'bentocache-drivers-spec' })
        .useL1Layer(memoryDriver({ maxItems: 10 }))
        .useL2Layer(redisDriver({ connection: new Redis({ data: {} }) })),
    },
  });

  await cache.set({ key: 'token', value: { id: 'abc' }, ttl: '1min' });
  await expect(cache.get({ key: 'token' })).resolves.toEqual({ id: 'abc' });

  await cache.delete({ key: 'token' });
  await expect(cache.get({ key: 'token' })).resolves.toBeUndefined();

  await cache.disconnectAll();
});
