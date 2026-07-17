// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { useEnv } from './env';

describe('useEnv', () => {
  it('setEnv replaces the env wholesale and fires onEnvChange', () => {
    const onEnvChange = vi.fn();
    const { result } = renderHook(() =>
      useEnv({ defaultEnv: { variables: { a: '1' } }, onEnvChange }),
    );

    act(() => {
      result.current.setEnv({ variables: { b: '2' } });
    });

    expect(result.current.env).toEqual({ variables: { b: '2' } });
    expect(onEnvChange).toHaveBeenCalledWith({ variables: { b: '2' } });
  });
});
