import Link from 'next/link';
import { cn } from '@theguild/components';
import { prettyPrintTag } from '../pretty-print-tag';

export function CategoryFilterLink({
  category,
  currentCategory,
}: {
  category: string | null;
  currentCategory: string | null;
}) {
  return (
    <Link
      href={category ? `/blog/tag/${category}` : '/blog'}
      className={cn(
        'hive-focus inline-block min-w-16 rounded-full border border-green-200 px-3 py-2.5 text-center transition duration-100 hover:border-green-800 dark:border-neutral-700 dark:hover:border-neutral-500',
        currentCategory === category
          ? 'text-green-1000 bg-green-200 hover:!bg-transparent hover:text-green-800 dark:bg-neutral-800 dark:text-white dark:hover:text-white/80'
          : 'hover:bg-beige-100 hover:text-green-1000 text-green-800 dark:text-white/80 dark:hover:bg-neutral-800 dark:hover:text-white',
      )}
    >
      {prettyPrintTag(category || 'All')}
    </Link>
  );
}
