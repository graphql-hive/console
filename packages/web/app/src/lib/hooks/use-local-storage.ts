import { useCallback, useEffect, useState } from 'react';
import { readVersionedEntryLocalStorage, VersionedEntrySpec } from '../versioned-entry';

export function useLocalStorage(key: string | VersionedEntrySpec, defaultValue: string) {
  const versionedEntry: VersionedEntrySpec = typeof key === 'string' ? [{ key }] : key;
  const versionedEntrySerialized = versionedEntry.map(_ => _.key).join(',');

  const getInitialValue = useCallback(() => {
    const value = readVersionedEntryLocalStorage({ spec: versionedEntry });
    return value ?? defaultValue;
  }, [versionedEntrySerialized, defaultValue]);

  const [value, setValue] = useState(getInitialValue());

  useEffect(() => {
    setValue(getInitialValue());
  }, [getInitialValue]);

  const set = useCallback(
    (value: string) => {
      localStorage.setItem(versionedEntry[0].key, value);
      setValue(value);
    },
    [getInitialValue],
  );

  return [value, set] as const;
}
