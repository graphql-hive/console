import Link from 'next/link';
import { cn } from '@theguild/components';

export function CategoryFilterLink({
  category,
  currentCategory,
}: {
  category: string | null;
  currentCategory: string | null;
}) {
  return (
    <Link
      href={{ search: category ? `category=${category}` : '' }}
      className={cn(
        'rounded-full px-3 py-1',
        currentCategory === category && 'bg-gray-100 text-gray-900', // todo: actual styles
      )}
    >
      {category}
    </Link>
  );
}
