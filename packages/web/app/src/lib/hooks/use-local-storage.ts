import { useCallback, useEffect, useState } from 'react';
import {
  readVersionedEntryLocalStorage,
  serializeEntrySpec,
  serializeVersionedEntrySpec,
  VersionedEntrySpec,
} from '../versioned-entry';

export function useLocalStorage(key: string | VersionedEntrySpec, defaultValue: string) {
  const versionedEntry: VersionedEntrySpec = typeof key === 'string' ? [{ key }] : key;
  const versionedEntrySerialized = serializeVersionedEntrySpec(versionedEntry);

  const versionedEntryLatest = versionedEntry[0];
  const versionedEntryLatestSerialized = serializeEntrySpec(versionedEntryLatest);

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
      localStorage.setItem(versionedEntryLatest.key, value);
      setValue(value);
    },
    [versionedEntryLatestSerialized],
  );

  return [value, set] as const;
}
