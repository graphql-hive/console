/**
 * Stand-in for `@/lib/laboratory-history-storage`, which opens an IndexedDB store at import time;
 * jsdom has no `indexedDB`.
 * `vi.mock('@/lib/laboratory-history-storage', () => import('@/lib/testing/mocks/laboratory-history-storage'))`.
 */
type Module = typeof import('@/lib/laboratory-history-storage');

export const loadTargetHistory: Module['loadTargetHistory'] = async () => [];
export const hasTargetHistory: Module['hasTargetHistory'] = async () => false;
export const saveTargetHistory: Module['saveTargetHistory'] = async () => true;
export const loadSnapshotHistory: Module['loadSnapshotHistory'] = async () => [];
