import { createStore, del, get, set } from 'idb-keyval';
import type { LaboratoryHistory } from '@graphql-hive/laboratory';

const STORE = createStore('hive-laboratory-db', 'history-store');
const HISTORY_KEY = 'history';
const LS_KEY = 'hive:laboratory:history';

export async function loadHistory(): Promise<LaboratoryHistory[]> {
  try {
    const fromIdb = await get<LaboratoryHistory[]>(HISTORY_KEY, STORE);
    if (fromIdb !== undefined) {
      return fromIdb;
    }

    // Migrate from localStorage on first load
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as LaboratoryHistory[];
      await set(HISTORY_KEY, parsed, STORE);
      localStorage.removeItem(LS_KEY);
      return parsed;
    }
  } catch (err) {
    console.error('[Laboratory] Failed to load history from IndexedDB:', err);
    // Fall back to localStorage
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        return JSON.parse(raw) as LaboratoryHistory[];
      }
    } catch {
      // Corrupt data — start fresh
      localStorage.removeItem(LS_KEY);
    }
  }
  return [];
}

export async function saveHistory(history: LaboratoryHistory[]): Promise<void> {
  try {
    await set(HISTORY_KEY, history, STORE);
  } catch (err) {
    console.error('[Laboratory] Failed to save history to IndexedDB:', err);
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await del(HISTORY_KEY, STORE);
  } catch (err) {
    console.error('[Laboratory] Failed to clear history from IndexedDB:', err);
  }
}
