// --------------------------------------------------------------------
// KeyValueStore Interface
// --------------------------------------------------------------------

export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export type KeyValueStoreDatabase = Record<string, string>;

// --------------------------------------------------------------------
// Versioned Entry Data Types
// --------------------------------------------------------------------

export type VersionedEntrySpec = readonly [EntrySpec, ...(readonly EntrySpec[])];

interface EntrySpec {
  key: string;
  // todo once we have use-case
  // schema:
  // fromPrevious:
}

// --------------------------------------------------------------------
// Versioned Entry Functions
// --------------------------------------------------------------------

/**
 * Read a versioned entry from local storage.
 *
 * Migrations are automatically applied to bring previous entries up to date with current.
 *
 * 1. The latest entry value is returned.
 * 2. If the latest entry to have a value is NOT the current entry, then current entry is set to the latest value.
 * 3. All entries prior the current that are present are deleted.
 *
 * Implied by the above but to make explicit: if multiple entries have values, only the
 * latest entry with a value is considered.
 *
 * @remarks The hardcoding to localStorage is minimal. It could be easily parameterized to support for example Redis.
 */
export const readVersionedEntry =
  (keyValueStore: KeyValueStore) =>
  (versionedEntry: VersionedEntrySpec): string | null => {
    type SearchResult = SearchResultHit | SearchResultMiss;

    interface SearchResultHit extends SearchResultEither {
      value: string;
    }

    interface SearchResultMiss extends SearchResultEither {
      value: null;
    }

    interface SearchResultEither {
      value: string | null;
      entry: EntrySpec;
      index: number;
    }

    // ---

    const searchResults: SearchResult[] = [];

    for (const { entry, index } of versionedEntry.map((entry, index) => ({ entry, index }))) {
      const value = keyValueStore.get(entry.key);
      searchResults.push({ entry, value, index });
      // remove previous entries
      // Note: Once we have schemas, we should not remove here, wait until _after_ successful migration
      if (index > 0) {
        keyValueStore.remove(entry.key);
      }
    }

    const latestHit = searchResults.find(({ value }) => value !== null) as
      | SearchResultHit
      | undefined;

    if (!latestHit) return null;

    if (latestHit.index > 0) {
      keyValueStore.set(versionedEntry[0].key, latestHit.value);
      // Note: Once we have schemas, we will need to run the value through the migration pipeline.
    }

    return latestHit.value;
  };

// --------------------------------------------------------------------
// KeyValueStore Implementations
// --------------------------------------------------------------------

export const keyValueStoreLocalStorage: KeyValueStore = {
  get(key) {
    return localStorage.getItem(key);
  },
  set(key, value) {
    localStorage.setItem(key, value);
  },
  remove(key) {
    localStorage.removeItem(key);
  },
};

export const readVersionedEntryLocalStorage = readVersionedEntry(keyValueStoreLocalStorage);

export const createKeyValueStoreMemory = (database: KeyValueStoreDatabase): KeyValueStore => ({
  get(key) {
    return database[key] ?? null;
  },
  set(key, value) {
    database[key] = value;
  },
  remove(key) {
    delete database[key];
  },
});
