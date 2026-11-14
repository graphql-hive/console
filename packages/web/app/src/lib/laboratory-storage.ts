const prefix = (targetId: string) => `hive:laboratory:target:${targetId}:`;

export type LaboratoryStorageKey =
  | 'env'
  | 'preflightEnabled'
  | 'pluginsState'
  | 'operations'
  | 'tabs'
  | 'activeTabId'
  | 'settings'
  | 'apiTab'
  | 'seeded';

export interface LaboratoryStorage {
  key: (key: LaboratoryStorageKey) => string;
  has: (key: LaboratoryStorageKey) => boolean;
  get: <T>(key: LaboratoryStorageKey, fallback: T) => T;
  set: (key: LaboratoryStorageKey, value: unknown) => void;
}

/** Lab state saved in the browser, scoped to one target so no other target can read it. */
export function laboratoryStorage(targetId: string): LaboratoryStorage {
  const key = (name: LaboratoryStorageKey) => `${prefix(targetId)}${name}`;

  return {
    key,
    has: name => localStorage.getItem(key(name)) !== null,
    get: (name, fallback) => {
      const raw = localStorage.getItem(key(name));

      if (raw === null) {
        return fallback;
      }

      try {
        return JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set: (name, value) => {
      try {
        localStorage.setItem(key(name), JSON.stringify(value));
      } catch (error) {
        // Quota exceeded: the lab keeps working from memory, only this write is lost.
        console.error('[Laboratory] Failed to save state:', error);
      }
    },
  };
}
