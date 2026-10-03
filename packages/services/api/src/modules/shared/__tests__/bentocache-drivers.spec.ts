import { BentoCache, bentostore } from 'bentocache';
import { memoryDriver } from 'bentocache/drivers/memory';
import { redisDriver } from 'bentocache/drivers/redis';

// The cache providers import the drivers from these public sub-paths. The package-internal paths
// they replaced only fail at runtime inside a bundled service, so pin the public ones here.
it('round-trips through a store built from the public memory sub-path', async ({ expect }) => {
  const cache = new BentoCache({
    default: 'spec',
    stores: {
      spec: bentostore({ prefix: 'bentocache-drivers-spec' }).useL1Layer(
        memoryDriver({ maxItems: 10 }),
      ),
    },
  });

  await cache.set({ key: 'token', value: { id: 'abc' }, ttl: '1min' });
  await expect(cache.get({ key: 'token' })).resolves.toEqual({ id: 'abc' });

  await cache.delete({ key: 'token' });
  await expect(cache.get({ key: 'token' })).resolves.toBeUndefined();

  await cache.disconnectAll();
});

// bentocache opens a real connection for any `connection` that is not an ioredis instance, and
// ioredis-mock instances do not pass its instanceof check, so the redis sub-path is resolved
// here but not exercised.
it('exposes the redis driver factory from the public redis sub-path', ({ expect }) => {
  const driver = redisDriver({ connection: { host: '127.0.0.1', port: 6379, lazyConnect: true } });

  expect(typeof driver.factory).toBe('function');
  expect(driver.options).toMatchObject({ connection: { lazyConnect: true } });
});
