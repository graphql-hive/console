// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { retentionBoundary } from './use-date-range-controller';
import { useRangeWithin } from './use-range-within';

const LAST_MONTH = { from: 'now-30d', to: 'now' };
const LAST_WEEK = { from: 'now-7d', to: 'now' };
const LAST_DAY = { from: 'now-1d', to: 'now' };

function rendered(retentionInDays: number) {
  return renderHook(({ days }) => useRangeWithin(LAST_MONTH, retentionBoundary(days), LAST_WEEK), {
    initialProps: { days: retentionInDays },
  });
}

describe('useRangeWithin', () => {
  it('keeps a range the retention covers and falls back on one it does not', () => {
    expect(rendered(90).result.current[0]).toEqual(LAST_MONTH);
    expect(rendered(7).result.current[0]).toEqual(LAST_WEEK);
  });

  it('follows a retention change without a remount, in both directions', () => {
    const hook = rendered(90);

    hook.rerender({ days: 7 });
    expect(hook.result.current[0]).toEqual(LAST_WEEK);

    hook.rerender({ days: 90 });
    expect(hook.result.current[0]).toEqual(LAST_MONTH);
  });

  it('takes a new pick', () => {
    const hook = rendered(7);

    act(() => hook.result.current[1](LAST_DAY));

    expect(hook.result.current[0]).toEqual(LAST_DAY);
  });
});
