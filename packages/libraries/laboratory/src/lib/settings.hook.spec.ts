// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { defaultLaboratorySettings, useSettings, type LaboratorySettings } from './settings';

describe('useSettings', () => {
  it('normalizes defaultSettings on mount', () => {
    const { result } = renderHook(() => useSettings({ defaultSettings: null }));
    expect(result.current.settings).toEqual(defaultLaboratorySettings);
  });

  it('setSettings normalizes its input and fires onSettingsChange with the normalized value', () => {
    const onSettingsChange = vi.fn();
    const { result } = renderHook(() => useSettings({ onSettingsChange }));

    act(() => {
      result.current.setSettings({
        fetch: { credentials: 'omit' },
        subscriptions: { protocol: 'SSE' },
        introspection: {},
      } as unknown as LaboratorySettings);
    });

    expect(result.current.settings.fetch.credentials).toBe('omit');
    expect(result.current.settings.fetch.timeout).toBe(10000);
    expect(onSettingsChange).toHaveBeenCalledWith(
      expect.objectContaining({
        fetch: expect.objectContaining({ credentials: 'omit', timeout: 10000 }),
      }),
    );
  });
});
