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
 * 3. All entries prior the current that are present are either deleted or ignored based on removalStrategy.
 *
 * @param options.removalStrategy - Strategy for handling previous entries (RemovalStrategy.Remove or RemovalStrategy.Ignore, defaults to Ignore)
 */
export const readVersionedEntry =
  (keyValueStore: KeyValueStore) =>
  (parameters: {
    spec: VersionedEntrySpec;
    /**
     * @defaultValue 'ignore'
     */
    previousEntriesPolicy?: PreviousEntriesPolicy;
  }): string | null => {
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
    const { spec, previousEntriesPolicy = PreviousEntriesPolicy.ignore } = parameters;

    const searchResults: SearchResult[] = [];

    for (const { entry, index } of spec.map((entry, index) => ({ entry, index }))) {
      const value = keyValueStore.get(entry.key);
      searchResults.push({ entry, value, index });
      // Note: Once we have schemas, we should not remove here, wait until _after_ successful migration
      if (index > 0 && previousEntriesPolicy === PreviousEntriesPolicy.remove) {
        keyValueStore.remove(entry.key);
      }
    }

    const latestHit = searchResults.find(({ value }) => value !== null) as
      | SearchResultHit
      | undefined;

    if (!latestHit) return null;

    if (latestHit.index > 0) {
      keyValueStore.set(spec[0].key, latestHit.value);
      // Note: Once we have schemas, we will need to run the value through the migration pipeline.
    }

    return latestHit.value;
  };

export const PreviousEntriesPolicy = {
  remove: 'remove',
  ignore: 'ignore',
} as const;

export type PreviousEntriesPolicy = keyof typeof PreviousEntriesPolicy;

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
