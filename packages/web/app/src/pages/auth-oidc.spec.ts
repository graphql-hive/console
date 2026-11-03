// @vitest-environment jsdom
import { renderAtUrl } from '@/lib/testing/router';
import { createTestClient } from '@/lib/testing/urql';
import { screen } from '@testing-library/react';

// The tree imports every page; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
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
// The provider hand-off leaves the page; here it just never resolves.
const thirdParty = vi.hoisted(() => ({ startThirdPartyAuth: vi.fn(() => new Promise(() => {})) }));
vi.mock('@/lib/auth/third-party', () => thirdParty);

describe('OIDC hand-off page', () => {
  beforeEach(() => {
    thirdParty.startThirdPartyAuth.mockClear();
  });

  it('names the organization it is sending the visitor to', async () => {
    renderAtUrl('/auth/oidc?id=oidc-1&slug=the-guild&redirectToPath=%2Fthe-guild', {
      client: createTestClient(),
    });
    await screen.findByText('You are being redirected to the identity provider for the-guild.');
    expect(thirdParty.startThirdPartyAuth).toHaveBeenCalledWith('oidc', '/the-guild', 'oidc-1');
  });

  it('stays generic without a slug', async () => {
    renderAtUrl('/auth/oidc?id=oidc-1', { client: createTestClient() });
    await screen.findByText('You are being redirected to your OIDC provider.');
  });

  it('asks for an id when there is none', async () => {
    renderAtUrl('/auth/oidc?slug=the-guild', { client: createTestClient() });
    await screen.findByText('Missing ID');
    expect(thirdParty.startThirdPartyAuth).not.toHaveBeenCalled();
  });
});
