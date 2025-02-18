import { useCallback, useState } from 'react';

export function useLocalStorage(key: string, defaultValue: string) {
  const [value, setValue] = useState<string>(() => {
    const value = localStorage.getItem(key);
    return value ?? defaultValue;
  });

  const set = useCallback(
    (value: string) => {
      localStorage.setItem(key, value);
      setValue(value);
    },
    [setValue],
  );

  return [value, set] as const;
}
