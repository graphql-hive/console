// @vitest-environment jsdom
import { laboratoryStorage } from '@/lib/laboratory-storage';
import { act, renderHook } from '@testing-library/react';
import { useApiTabValue } from './use-api-tab-value';

const ENDPOINT = 'https://api.example.com/graphql';

afterEach(() => {
  localStorage.clear();
});

describe('useApiTabValue', () => {
  it('defaults to the API when the target has an endpoint, otherwise Mock', () => {
    expect(renderHook(() => useApiTabValue('target-a', ENDPOINT)).result.current[0]).toBe(
      'linkedApi',
    );
    expect(renderHook(() => useApiTabValue('target-a', null)).result.current[0]).toBe('mockApi');
  });

  it('saves the choice for this target only', () => {
    const { result } = renderHook(() => useApiTabValue('target-a', ENDPOINT));

    act(() => result.current[1]('mockApi'));

    expect(result.current[0]).toBe('mockApi');
    expect(laboratoryStorage('target-a').get('apiTab', null)).toBe('mockApi');
    expect(laboratoryStorage('target-b').has('apiTab')).toBe(false);
  });

  it("switches to the next target's own choice", () => {
    laboratoryStorage('target-a').set('apiTab', 'mockApi');
    const { result, rerender } = renderHook(({ targetId }) => useApiTabValue(targetId, ENDPOINT), {
      initialProps: { targetId: 'target-a' },
    });
    expect(result.current[0]).toBe('mockApi');

    rerender({ targetId: 'target-b' });

    expect(result.current[0]).toBe('linkedApi');
  });

  it('reads the saved choice once the target is ready', () => {
    const { result, rerender } = renderHook(({ targetId }) => useApiTabValue(targetId, ENDPOINT), {
      initialProps: { targetId: null as string | null },
    });
    expect(result.current[0]).toBe('linkedApi');

    laboratoryStorage('target-a').set('apiTab', 'mockApi');
    rerender({ targetId: 'target-a' });

    expect(result.current[0]).toBe('mockApi');
  });

  it('falls back to Mock when the saved API choice has no endpoint', () => {
    laboratoryStorage('target-a').set('apiTab', 'linkedApi');

    expect(renderHook(() => useApiTabValue('target-a', null)).result.current[0]).toBe('mockApi');
  });
});
