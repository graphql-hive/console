/**
 * Stand-in for `@/lib/laboratory-history-storage`, which opens an IndexedDB store at import time;
 * jsdom has no `indexedDB`.
 * `vi.mock('@/lib/laboratory-history-storage', () => import('@/lib/testing/mocks/laboratory-history-storage'))`.
 */
export const loadHistory: typeof import('@/lib/laboratory-history-storage').loadHistory =
  async () => [];
export const saveHistory: typeof import('@/lib/laboratory-history-storage').saveHistory =
  async () => {};
