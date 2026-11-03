// @vitest-environment jsdom
import type { OidcIdLookupResult } from '@/lib/auth/api';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { createMemoryHistory } from '@tanstack/react-router';
import { fireEvent, screen, waitFor } from '@testing-library/react';

// The tree imports every page; these stand in for what cannot load under jsdom.
const oidcEnabled = vi.hoisted(() => ({ current: true }));
vi.mock('@/env/frontend', async () => {
  const { env } = await import('@/lib/testing/mocks/env');
  return {
    get env() {
      return { ...env, auth: { ...env.auth, oidc: oidcEnabled.current } };
    },
  };
});
vi.mock('@/lib/auth/providers', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/auth/providers')>()),
  isProviderEnabled: (provider: string) => provider === 'oidc' && oidcEnabled.current,
}));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);
vi.mock('@/components/schema-editor', async importOriginal => ({
  ...(await importOriginal<typeof import('@/components/schema-editor')>()),
  SchemaEditor: () => null,
}));
vi.mock('@/components/ui/primitives/chart/chart', () => ({ Chart: () => null }));

// Anonymous, as a visitor on the SSO page is.
const signedIn = vi.hoisted(() => ({ current: false }));
vi.mock('@/lib/auth/session', async () => {
  const standIn = await import('@/lib/testing/mocks/auth-session');
  const absent = { status: 'absent' } as const;
  return {
    ...standIn,
    getSnapshot: () => (signedIn.current ? standIn.getSnapshot() : absent),
    getSession: () => (signedIn.current ? standIn.getSession() : null),
    doesSessionExist: async () => signedIn.current,
  };
});
const api = vi.hoisted(() => ({
  lookupOidcId: vi.fn<(input: { slug: string }) => Promise<OidcIdLookupResult>>(),
}));
vi.mock('@/lib/auth/api', () => api);

function slugField() {
  return document.querySelector<HTMLInputElement>('input[name="slug"]')!;
}

const found: OidcIdLookupResult = { ok: true, id: 'oidc-1' };
const missing: OidcIdLookupResult = {
  ok: false,
  title: 'SSO integration not found',
  description: 'Your organization lacks an SSO integration or it does not exist.',
  status: 404,
};

// The route alone, without rendering: what the loader decided is in the router state.
async function loadAt(url: string) {
  const { createAppRouter } = await import('@/router');
  const router = createAppRouter({
    history: createMemoryHistory({ initialEntries: [url] }),
    urqlClient: createTestClient(),
  });
  await router.load();
  return router;
}

describe('SSO sign-in page', () => {
  beforeEach(() => {
    signedIn.current = false;
    oidcEnabled.current = true;
    sessionStorage.clear();
    api.lookupOidcId.mockReset();
  });

  it('goes straight to the provider when the organization has SSO', async () => {
    api.lookupOidcId.mockResolvedValue(found);
    const router = await loadAt('/auth/sso?redirectToPath=%2Fthe-guild%2Fview%2Fsettings');
    expect(router.state.location.pathname).toBe('/auth/oidc');
    expect(router.state.location.search).toEqual({
      id: 'oidc-1',
      slug: 'the-guild',
      redirectToPath: '/the-guild/view/settings',
    });
    expect(router.history.length).toBe(1);
    expect(api.lookupOidcId).toHaveBeenCalledTimes(1);
    expect(api.lookupOidcId).toHaveBeenCalledWith({ slug: 'the-guild' });
  });

  it('prefers an explicit slug over the path', async () => {
    api.lookupOidcId.mockResolvedValue(found);
    const router = await loadAt('/auth/sso?slug=Acme&redirectToPath=%2Fthe-guild');
    expect(router.state.location.pathname).toBe('/auth/oidc');
    expect(api.lookupOidcId).toHaveBeenCalledWith({ slug: 'acme' });
  });

  it('shows the prefilled form when the organization has no SSO', async () => {
    api.lookupOidcId.mockResolvedValue(missing);
    renderAtUrl('/auth/sso?redirectToPath=%2Fthe-guild%2Fview%2Fsettings', {
      client: createTestClient(),
    });
    await screen.findByText('Sign in');
    expect(slugField().value).toBe('the-guild');
    expect(screen.queryByText('SSO integration not found')).toBeNull();
  });

  it('shows the prefilled form when the lookup fails', async () => {
    api.lookupOidcId.mockRejectedValue(new Error('Server error'));
    renderAtUrl('/auth/sso?slug=123', { client: createTestClient() });
    await screen.findByText('Sign in');
    expect(slugField().value).toBe('123');
    expect(screen.queryByText('An error occurred')).toBeNull();
  });

  it('still looks up what the visitor types', async () => {
    api.lookupOidcId.mockResolvedValueOnce(missing).mockResolvedValueOnce(found);
    const { router } = renderAtUrl('/auth/sso?redirectToPath=%2Fthe-guild', {
      client: createTestClient(),
    });
    await screen.findByText('Sign in');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(undefined);
    fireEvent.change(slugField(), { target: { value: 'acme' } });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/auth/oidc',
        search: { id: 'oidc-1', slug: 'acme', redirectToPath: '/the-guild' },
      }),
    );
    expect(api.lookupOidcId).toHaveBeenLastCalledWith({ slug: 'acme' });
  });

  it('does not look anything up for a signed-in visitor', async () => {
    signedIn.current = true;
    await loadAt('/auth/sso?redirectToPath=%2Fthe-guild');
    expect(api.lookupOidcId).not.toHaveBeenCalled();
  });

  it('does not look anything up without an OIDC provider', async () => {
    oidcEnabled.current = false;
    await loadAt('/auth/sso?redirectToPath=%2Fthe-guild');
    expect(api.lookupOidcId).not.toHaveBeenCalled();
  });

  it('does not look anything up on a preload', async () => {
    const router = await loadAt('/auth/sign-in?redirectToPath=%2Fthe-guild');
    await router.preloadRoute({ to: '/auth/sso', search: { redirectToPath: '/the-guild' } });
    expect(api.lookupOidcId).not.toHaveBeenCalled();
  });

  it.each([
    '/auth/sso',
    '/auth/sso?redirectToPath=%2Fmanage',
    '/auth/sso?slug=%20',
    '/auth/sso?slug=true',
  ])('starts empty at %s', async url => {
    renderAtUrl(url, { client: createTestClient() });
    await screen.findByText('Sign in');
    expect(slugField().value).toBe('');
    expect(api.lookupOidcId).not.toHaveBeenCalled();
  });
});
