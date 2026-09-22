// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
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
    const { legacyPaths } = await import('./legacy');
    expect(legacyPaths.map(entry => entry.path)).toMatchInlineSnapshot(`
      [
        trace/$traceId,
        view/manage-subscription,
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

  it('sends /auth to sign-in with the return path', { timeout: 30_000 }, async () => {
    const router = await loadAt('/auth?redirectToPath=%2Facme');
    expect(router.state.location.pathname).toBe('/auth/sign-in');
    expect(router.state.location.search).toEqual({ redirectToPath: '/acme' });
  });
});
