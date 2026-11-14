import { createStore, get, set } from 'idb-keyval';
import type { LaboratoryHistory } from '@graphql-hive/laboratory';

const STORE = createStore('hive-laboratory-db', 'history-store');
// History from before labs were per target. Read only, as the source for seeding targets.
const SNAPSHOT_KEY = 'history';
const SNAPSHOT_LS_KEY = 'hive:laboratory:history';

const targetKey = (targetId: string) => `history:${targetId}`;

/** `null` when IndexedDB failed, so a caller can skip saving over history it never read. */
export async function loadTargetHistory(targetId: string): Promise<LaboratoryHistory[] | null> {
  try {
    return (await get<LaboratoryHistory[]>(targetKey(targetId), STORE)) ?? [];
  } catch (err) {
    console.error('[Laboratory] Failed to load history from IndexedDB:', err);
    return null;
  }
}

export async function hasTargetHistory(targetId: string): Promise<boolean | null> {
  try {
    return (await get(targetKey(targetId), STORE)) !== undefined;
  } catch {
    return null;
  }
}

/** Resolves `false` when the write failed. */
export async function saveTargetHistory(
  targetId: string,
  history: LaboratoryHistory[],
): Promise<boolean> {
  try {
    await set(targetKey(targetId), history, STORE);
    return true;
  } catch (err) {
    console.error('[Laboratory] Failed to save history to IndexedDB:', err);
    return false;
  }
}

/** `null` when IndexedDB failed. Falls back to the copy kept in localStorage before IndexedDB. */
export async function loadSnapshotHistory(): Promise<LaboratoryHistory[] | null> {
  try {
    const fromIdb = await get<LaboratoryHistory[]>(SNAPSHOT_KEY, STORE);

    if (fromIdb !== undefined) {
      return fromIdb;
    }
  } catch (err) {
    console.error('[Laboratory] Failed to load history from IndexedDB:', err);
    return null;
  }

  try {
    const raw = localStorage.getItem(SNAPSHOT_LS_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// The page's global history, replaced by the per-target functions above once the page reads them.
export async function loadHistory(): Promise<LaboratoryHistory[]> {
  return (await loadSnapshotHistory()) ?? [];
}

export async function saveHistory(history: LaboratoryHistory[]): Promise<void> {
  try {
    await set(SNAPSHOT_KEY, history, STORE);
  } catch (err) {
    console.error('[Laboratory] Failed to save history to IndexedDB:', err);
  }
}
