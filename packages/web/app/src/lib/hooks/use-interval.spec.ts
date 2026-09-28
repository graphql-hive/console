// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { useInterval } from './use-interval';

describe('useInterval', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('fires every interval and never on mount', () => {
    const fn = vi.fn();
    renderHook(() => useInterval(1000, fn));
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(999);
    expect(fn).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(2000);
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('runs the newest callback without restarting the timer', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ fn }) => useInterval(1000, fn), {
      initialProps: { fn: first },
    });

    vi.advanceTimersByTime(600);
    rerender({ fn: second });
    vi.advanceTimersByTime(400);

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('stops on unmount', () => {
    const fn = vi.fn();
    const { unmount } = renderHook(() => useInterval(1000, fn));

    unmount();
    vi.advanceTimersByTime(5000);

    expect(fn).not.toHaveBeenCalled();
  });
});
