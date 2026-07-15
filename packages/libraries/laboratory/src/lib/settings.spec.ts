import { defaultLaboratorySettings, normalizeLaboratorySettings } from './settings';

describe('defaultLaboratorySettings', () => {
  it('has the documented defaults', () => {
    expect(defaultLaboratorySettings.fetch.credentials).toBe('same-origin');
    expect(defaultLaboratorySettings.fetch.timeout).toBe(10000);
    expect(defaultLaboratorySettings.subscriptions.protocol).toBe('WS');
    expect(defaultLaboratorySettings.introspection.method).toBe('POST');
  });
});

describe('normalizeLaboratorySettings', () => {
  it('returns the full defaults for null', () => {
    expect(normalizeLaboratorySettings(null)).toEqual(defaultLaboratorySettings);
  });

  it('returns the full defaults for undefined', () => {
    expect(normalizeLaboratorySettings(undefined)).toEqual(defaultLaboratorySettings);
  });

  it('returns the full defaults for an empty object', () => {
    expect(normalizeLaboratorySettings({})).toEqual(defaultLaboratorySettings);
  });

  it('fills only the missing keys and passes provided values through', () => {
    const result = normalizeLaboratorySettings({ fetch: { credentials: 'omit' } });
    expect(result.fetch.credentials).toBe('omit');
    expect(result.fetch.timeout).toBe(10000);
    expect(result.subscriptions.protocol).toBe('WS');
    expect(result.introspection.method).toBe('POST');
  });

  it('coalesces a nested null back to the default (e.g. fetch.timeout)', () => {
    const result = normalizeLaboratorySettings({ fetch: { timeout: null } } as never);
    expect(result.fetch.timeout).toBe(10000);
  });

  it('passes through non-default nested values', () => {
    const result = normalizeLaboratorySettings({
      subscriptions: { protocol: 'SSE' },
      introspection: { method: 'GET', headers: '{"a":"b"}' },
    });
    expect(result.subscriptions.protocol).toBe('SSE');
    expect(result.introspection.method).toBe('GET');
    expect(result.introspection.headers).toBe('{"a":"b"}');
  });
});
