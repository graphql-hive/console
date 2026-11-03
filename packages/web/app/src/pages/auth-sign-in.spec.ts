// @vitest-environment jsdom
import type { OidcIdLookupResult } from '@/lib/auth/api';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { screen, waitFor } from '@testing-library/react';

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

// Anonymous, as a visitor on the sign-in page is.
vi.mock('@/lib/auth/session', async () => {
  const standIn = await import('@/lib/testing/mocks/auth-session');
  const absent = { status: 'absent' } as const;
  return {
    ...standIn,
    getSnapshot: () => absent,
    getSession: () => null,
    doesSessionExist: async () => false,
  };
});
const api = vi.hoisted(() => ({
  signIn: vi.fn(),
  lookupOidcId: vi.fn<(input: { slug: string }) => Promise<OidcIdLookupResult>>(),
}));
vi.mock('@/lib/auth/api', () => api);

const found: OidcIdLookupResult = { ok: true, id: 'oidc-1' };
const missing: OidcIdLookupResult = {
  ok: false,
  title: 'SSO integration not found',
  description: 'Your organization lacks an SSO integration or it does not exist.',
  status: 404,
};

function ssoLink() {
  return screen.getByRole('link', { name: /Login with SSO/ }) as HTMLAnchorElement;
}

function searchOf(link: HTMLAnchorElement) {
  const url = new URL(link.getAttribute('href')!, 'http://localhost');
  return { pathname: url.pathname, search: Object.fromEntries(url.searchParams) };
}

describe('sign-in page SSO button', () => {
  beforeEach(() => {
    oidcEnabled.current = true;
    sessionStorage.clear();
    api.lookupOidcId.mockReset();
  });

  it('names the organization and links straight to its provider', async () => {
    api.lookupOidcId.mockResolvedValue(found);
    renderAtUrl('/auth/sign-in?redirectToPath=%2Fthe-guild%2Fview%2Fsettings', {
      client: createTestClient(),
    });
    await screen.findByText('Login with SSO (the-guild)');
    expect(searchOf(ssoLink())).toEqual({
      pathname: '/auth/oidc',
      search: { id: 'oidc-1', redirectToPath: '/the-guild/view/settings' },
    });
    expect(api.lookupOidcId).toHaveBeenCalledTimes(1);
    expect(api.lookupOidcId).toHaveBeenCalledWith({ slug: 'the-guild' });
  });

  it('stays the plain button when the organization has no SSO', async () => {
    api.lookupOidcId.mockResolvedValue(missing);
    renderAtUrl('/auth/sign-in?redirectToPath=%2Fthe-guild', { client: createTestClient() });
    await screen.findByText('Login with SSO');
    await waitFor(() => expect(api.lookupOidcId).toHaveBeenCalledTimes(1));
    expect(searchOf(ssoLink())).toEqual({
      pathname: '/auth/sso',
      search: { redirectToPath: '/the-guild' },
    });
    expect(screen.queryByText(/Login with SSO \(/)).toBeNull();
  });

  it('stays the plain button when the lookup fails', async () => {
    api.lookupOidcId.mockRejectedValue(new Error('Server error'));
    renderAtUrl('/auth/sign-in?redirectToPath=%2Fthe-guild', { client: createTestClient() });
    await screen.findByText('Login with SSO');
    await waitFor(() => expect(api.lookupOidcId).toHaveBeenCalledTimes(1));
    expect(searchOf(ssoLink()).pathname).toBe('/auth/sso');
    expect(screen.queryByText('An error occurred')).toBeNull();
  });

  it.each(['/auth/sign-in', '/auth/sign-in?redirectToPath=%2Fmanage'])(
    'looks nothing up at %s',
    async url => {
      renderAtUrl(url, { client: createTestClient() });
      await screen.findByText('Login with SSO');
      expect(searchOf(ssoLink()).pathname).toBe('/auth/sso');
      expect(api.lookupOidcId).not.toHaveBeenCalled();
    },
  );

  it('looks nothing up without an OIDC provider', async () => {
    oidcEnabled.current = false;
    renderAtUrl('/auth/sign-in?redirectToPath=%2Fthe-guild', { client: createTestClient() });
    await screen.findByText('Sign in');
    expect(screen.queryByText(/Login with SSO/)).toBeNull();
    expect(api.lookupOidcId).not.toHaveBeenCalled();
  });
});
