// @vitest-environment jsdom
import type { OidcIdLookupResult } from '@/lib/auth/api';
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { screen } from '@testing-library/react';

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

describe('SSO sign-in page', () => {
  beforeEach(() => {
    signedIn.current = false;
    oidcEnabled.current = true;
    sessionStorage.clear();
    api.lookupOidcId.mockReset();
  });

  it('prefills the slug from the page the visitor was sent from', async () => {
    renderAtUrl('/auth/sso?redirectToPath=%2Fthe-guild%2Fview%2Fsettings', {
      client: createTestClient(),
    });
    await screen.findByText('Sign in');
    expect(slugField().value).toBe('the-guild');
  });

  it('prefers an explicit slug over the path', async () => {
    renderAtUrl('/auth/sso?slug=Acme&redirectToPath=%2Fthe-guild', {
      client: createTestClient(),
    });
    await screen.findByText('Sign in');
    expect(slugField().value).toBe('acme');
  });

  it('keeps a slug the URL parser reads as a number', async () => {
    renderAtUrl('/auth/sso?slug=123', { client: createTestClient() });
    await screen.findByText('Sign in');
    expect(slugField().value).toBe('123');
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
  });
});
