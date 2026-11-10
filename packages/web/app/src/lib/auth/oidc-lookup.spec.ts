// @vitest-environment jsdom
import type { OidcIdLookupResult } from './api';
import { resolveOidcId } from './oidc-lookup';

const api = vi.hoisted(() => ({
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
const limited: OidcIdLookupResult = {
  ok: false,
  title: 'Rate Limited',
  description: 'Please try again later.',
  status: 400,
};

beforeEach(() => {
  sessionStorage.clear();
  api.lookupOidcId.mockReset();
});

describe('resolveOidcId', () => {
  it('asks the server once per slug when the organization has SSO', async () => {
    api.lookupOidcId.mockResolvedValue(found);
    await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
    await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
    expect(api.lookupOidcId).toHaveBeenCalledTimes(1);
    expect(api.lookupOidcId).toHaveBeenCalledWith({ slug: 'the-guild' });
  });

  it('remembers that a slug has no SSO', async () => {
    api.lookupOidcId.mockResolvedValue(missing);
    await expect(resolveOidcId('acme')).resolves.toEqual(missing);
    await expect(resolveOidcId('acme')).resolves.toEqual(missing);
    expect(api.lookupOidcId).toHaveBeenCalledTimes(1);
  });

  it('keeps slugs apart', async () => {
    api.lookupOidcId.mockResolvedValueOnce(found).mockResolvedValueOnce(missing);
    await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
    await expect(resolveOidcId('acme')).resolves.toEqual(missing);
    expect(api.lookupOidcId).toHaveBeenCalledTimes(2);
  });

  it('asks again after a rate limit', async () => {
    api.lookupOidcId.mockResolvedValueOnce(limited).mockResolvedValueOnce(found);
    await expect(resolveOidcId('the-guild')).resolves.toEqual(limited);
    await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
    expect(api.lookupOidcId).toHaveBeenCalledTimes(2);
  });

  it('asks again after a failure', async () => {
    api.lookupOidcId.mockRejectedValueOnce(new Error('Server error')).mockResolvedValueOnce(found);
    await expect(resolveOidcId('the-guild')).rejects.toThrow('Server error');
    await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
    expect(api.lookupOidcId).toHaveBeenCalledTimes(2);
  });

  it.each(['{not json', '{"ok":true}', '{"ok":true,"id":1}', '{"ok":false}', '"oidc-1"'])(
    'ignores a corrupt cache entry: %s',
    async raw => {
      sessionStorage.setItem('hive:oidc-lookup:the-guild', raw);
      api.lookupOidcId.mockResolvedValue(found);
      await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
      expect(api.lookupOidcId).toHaveBeenCalledTimes(1);
    },
  );

  it('works without storage', async () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    api.lookupOidcId.mockResolvedValue(found);
    await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
    await expect(resolveOidcId('the-guild')).resolves.toEqual(found);
    expect(api.lookupOidcId).toHaveBeenCalledTimes(2);
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
