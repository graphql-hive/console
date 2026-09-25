import { useCallback } from 'react';
import { SearchIcon } from 'lucide-react';
import { Input } from '@/components/base/input/input';
import { useRouter } from '@tanstack/react-router';

export function AppFilter() {
  const router = useRouter();
  const cb = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    void router.navigate({
      to: '.',
      search: {
        ...router.latestLocation.search,
        search: e.target.value === '' ? undefined : e.target.value,
      },
      replace: true,
    });
  }, []);
  const initialValue =
    'search' in router.latestLocation.search &&
    typeof router.latestLocation.search.search === 'string'
      ? router.latestLocation.search.search
      : '';

  return (
    <div className="min-w-[200px] grow">
      <Input
        placeholder="Search by operation name..."
        leadingIcon={SearchIcon}
        onChange={cb}
        defaultValue={initialValue}
      />
    </div>
  );
}
