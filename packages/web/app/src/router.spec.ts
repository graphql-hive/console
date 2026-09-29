// @vitest-environment jsdom
import { createTestClient } from '@/lib/testing/urql';

// The route tree imports every page. These stand in for the modules that cannot load under jsdom
// or that read the frontend env at import time.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

// The real client belongs to `main.tsx`; the router only carries whatever client it is given.
vi.mock('@/lib/urql', () => {
  throw new Error('the router module must not import @/lib/urql');
});

const superTokensInit = vi.hoisted(() => vi.fn());
vi.mock('supertokens-auth-react', async importOriginal => ({
  ...(await importOriginal<typeof import('supertokens-auth-react')>()),
  default: { init: superTokensInit },
}));

const sentryInit = vi.hoisted(() => vi.fn());
vi.mock('@sentry/react', async importOriginal => ({
  ...(await importOriginal<typeof import('@sentry/react')>()),
  init: sentryInit,
}));

describe('router module', () => {
  it(
    'can be imported without initializing SuperTokens or Sentry',
    { timeout: 30_000 },
    async () => {
      const { createAppRouter } = await import('./router');
      const router = createAppRouter({ urqlClient: createTestClient() });

      expect(router.routeTree).toBeDefined();
      expect(superTokensInit).not.toHaveBeenCalled();
      expect(sentryInit).not.toHaveBeenCalled();
    },
  );

  it('carries the urql client it is given in route context', { timeout: 30_000 }, async () => {
    const { createAppRouter } = await import('./router');
    const client = createTestClient();
    const router = createAppRouter({ urqlClient: client });

    expect(router.options.context.urqlClient).toBe(client);
  });

  it('owns the error and not-found boundaries for every route', { timeout: 30_000 }, async () => {
    const { createAppRouter } = await import('./router');
    const router = createAppRouter({ urqlClient: createTestClient() });
    const { ErrorComponent } = await import('@/components/error');
    const { RouteNotFound } = await import('./routes/root');

    expect(router.options.defaultErrorComponent).toBe(ErrorComponent);
    expect(router.options.defaultNotFoundComponent).toBe(RouteNotFound);

    const overriding = Object.values(router.routesById)
      .filter(route => route.options.errorComponent || route.options.notFoundComponent)
      .map(route => route.id);
    expect(overriding).toEqual([]);
  });
});
