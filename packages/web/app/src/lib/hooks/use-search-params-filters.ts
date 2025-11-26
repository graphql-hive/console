import { useRouter } from '@tanstack/react-router';

type SearchParamsFilter = string | string[];

export function useSearchParamsFilter<TValue extends SearchParamsFilter>(
  name: string,
  defaultState: TValue,
): [TValue, (value: TValue) => void] {
  const router = useRouter();
  const searchParams = router.latestLocation.search as any;

  const rawSearchValue =
    ((name as string) in searchParams && (searchParams[name] as string)) || null;

  /**
   * If our extracted search params (rawSearchValue) is an array, we deserialize.
   * Otherwise, it's just a simple string.
   */
  const searchValue = (
    rawSearchValue
      ? Array.isArray(defaultState)
        ? deserializeSearchValue(rawSearchValue)
        : rawSearchValue
      : defaultState
  ) as TValue;

  const setSearchValue = (value: TValue) => {
    void router.navigate({
      search: {
        ...searchParams,
        [name]: value.length === 0 ? undefined : serializeSearchValue(value),
      },
      replace: true,
    });
  };

  return [searchValue, setSearchValue];
}

function serializeSearchValue(value: string | string[]) {
  return Array.isArray(value) ? value.join(',') : value;
}

function deserializeSearchValue(value: string | null) {
  return value?.split(',');
}
