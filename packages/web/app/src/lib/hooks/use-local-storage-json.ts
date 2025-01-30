import { useCallback, useState } from 'react';

export function useLocalStorageJson<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    const json = localStorage.getItem(key);
    try {
      const result = json ? JSON.parse(json) : defaultValue;
      return result;
    } catch (_) {
      return defaultValue;
    }
  });

  const set = useCallback(
    (value: T) => {
      localStorage.setItem(key, JSON.stringify(value));
      setValue(value);
    },
    [setValue],
  );

  return [value, set] as const;
}
