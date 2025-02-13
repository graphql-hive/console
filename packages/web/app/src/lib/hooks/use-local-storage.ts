import { useCallback, useState } from 'react';
import { readVersionedEntryLocalStorage, VersionedEntrySpec } from '../versioned-entry';

export function useLocalStorage(key: string | VersionedEntrySpec, defaultValue: string) {
  const versionedEntry: VersionedEntrySpec = typeof key === 'string' ? [{ key }] : key;

  const [value, setValue] = useState<string>(() => {
    const value = readVersionedEntryLocalStorage({ spec: versionedEntry });
    return value ?? defaultValue;
  });

  const set = useCallback(
    (value: string) => {
      localStorage.setItem(versionedEntry[0].key, value);
      setValue(value);
    },
    [setValue],
  );

  return [value, set] as const;
}
