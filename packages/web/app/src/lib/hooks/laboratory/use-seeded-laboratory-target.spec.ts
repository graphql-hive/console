// @vitest-environment jsdom
import { renderHook, waitFor } from '@testing-library/react';
import { useSeededLaboratoryTarget } from './use-seeded-laboratory-target';

const mocks = vi.hoisted(() => ({
  seedTarget: vi.fn(),
  normalizeTargetEnv: vi.fn(),
  prepareSnapshot: vi.fn(),
}));

vi.mock('@/lib/laboratory-snapshot', () => ({
  seedTarget: mocks.seedTarget,
  normalizeTargetEnv: mocks.normalizeTargetEnv,
  prepareSnapshot: mocks.prepareSnapshot,
}));

const SLUG = 'the-guild/api/staging';

beforeEach(() => {
  mocks.seedTarget.mockResolvedValue(true);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useSeededLaboratoryTarget', () => {
  it('stays false until the target is known', () => {
    const { result } = renderHook(() => useSeededLaboratoryTarget(null, SLUG));

    expect(result.current).toBe(false);
    expect(mocks.seedTarget).not.toHaveBeenCalled();
  });

  it('becomes ready only after seeding resolves', async () => {
    let resolve!: (value: boolean) => void;
    mocks.seedTarget.mockReturnValue(new Promise<boolean>(r => (resolve = r)));

    const { result } = renderHook(() => useSeededLaboratoryTarget('target-a', SLUG));
    expect(result.current).toBe(false);
    expect(mocks.prepareSnapshot).toHaveBeenCalledBefore(mocks.seedTarget);

    resolve(true);

    await waitFor(() => expect(result.current).toBe(true));
    expect(mocks.normalizeTargetEnv).toHaveBeenCalledWith('target-a', SLUG);
  });

  it('mounts even when seeding has to be retried later', async () => {
    mocks.seedTarget.mockResolvedValue(false);

    const { result } = renderHook(() => useSeededLaboratoryTarget('target-a', SLUG));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is not ready for the next target until that one is seeded', async () => {
    const { result, rerender } = renderHook(
      ({ targetId }) => useSeededLaboratoryTarget(targetId, SLUG),
      { initialProps: { targetId: 'target-a' } },
    );
    await waitFor(() => expect(result.current).toBe(true));

    let resolve!: (value: boolean) => void;
    mocks.seedTarget.mockReturnValue(new Promise<boolean>(r => (resolve = r)));
    rerender({ targetId: 'target-b' });

    expect(result.current).toBe(false);
    resolve(true);
    await waitFor(() => expect(result.current).toBe(true));
  });
});
