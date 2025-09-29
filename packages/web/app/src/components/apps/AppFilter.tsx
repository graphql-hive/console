import { useRouter } from "@tanstack/react-router";
import { Input } from '@/components/ui/input'
import { useCallback } from "react";

export function AppFilter() {
  const router = useRouter();
  const cb = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    void router.navigate({
      search: {
        ...router.latestLocation.search,
        search: e.target.value === '' ? undefined : e.target.value,
      },
      replace: true,
    });
  }, [])
  const initialValue = 'search' in router.latestLocation.search &&
    typeof router.latestLocation.search.search === 'string'
      ? router.latestLocation.search.search
      : ''

  return (
    <Input
      className="min-w-[200px] grow cursor-text"
      placeholder="Search by operation name..."
      onChange={cb}
      defaultValue={initialValue}
    />
  );
}
