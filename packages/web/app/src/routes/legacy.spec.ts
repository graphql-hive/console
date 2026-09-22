// @vitest-environment jsdom
import { createMemoryHistory } from '@tanstack/react-router';

// The tree imports every page; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

async function loadAt(url: string) {
  const { createAppRouter } = await import('@/router');
  const router = createAppRouter({ history: createMemoryHistory({ initialEntries: [url] }) });
  await router.load();
  return router;
}

describe('legacy URLs', () => {
  it('has an entry for every old URL shape', { timeout: 30_000 }, async () => {
    const { legacyPaths, legacySearch } = await import('./legacy');
    expect(legacyPaths.map(entry => entry.path)).toMatchInlineSnapshot(`
      [
        trace/$traceId,
        view/manage-subscription,
        activity,
      ]
    `);
    expect(Object.keys(legacySearch)).toMatchInlineSnapshot(`
      [
        targetSettings,
        organizationSettings,
        projectSettings,
        organizationMembers,
      ]
    `);
  });

  it('lands each example on its new URL without a history entry', { timeout: 30_000 }, async () => {
    const { legacyPaths } = await import('./legacy');
    for (const { example } of legacyPaths) {
      const router = await loadAt(example.from);
      expect({ from: example.from, to: router.state.location.href }).toEqual({
        from: example.from,
        to: example.to,
      });
      expect(router.history.length).toBe(1);
    }
  });

  it('lands each old search form on its section path', { timeout: 30_000 }, async () => {
    const { legacySearch } = await import('./legacy');
    for (const entry of Object.values(legacySearch)) {
      for (const example of entry.examples) {
        const router = await loadAt(example.from);
        expect({ from: example.from, to: router.state.location.href }).toEqual({
          from: example.from,
          to: example.to,
        });
        expect(router.history.length).toBe(1);
      }
    }
  });

  it('sends /auth to sign-in with the return path', { timeout: 30_000 }, async () => {
    const router = await loadAt('/auth?redirectToPath=%2Facme');
    expect(router.state.location.pathname).toBe('/auth/sign-in');
    expect(router.state.location.search).toEqual({ redirectToPath: '/acme' });
  });

  // The env mock enables no auth provider.
  it('skips the OIDC interstitial when the provider is off', { timeout: 30_000 }, async () => {
    const router = await loadAt('/acme/oidc-request?id=oidc-1&redirectToPath=%2Facme%2Fshop');
    expect(router.state.location.pathname).toBe('/acme/shop');
  });
});
