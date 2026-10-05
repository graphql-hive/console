import { cn } from '@/lib/utils';

type FloatingSearchProps = {
  label: string;
  onSearch: (value: string) => void;
  value: string;
  placeholder?: string;
  /**
   * The input is the panel's only content, rather than a header above a list. Such a panel has no
   * padding of its own, so there is none for the `-mx-2` bleed to cancel, and all four corners
   * round since there's no list below to divide from.
   */
  standalone?: boolean;
};

export function FloatingSearch({
  label,
  onSearch,
  value,
  placeholder = 'Search...',
  standalone = false,
}: FloatingSearchProps) {
  return (
    <div className={cn('relative', !standalone && '-mx-2')}>
      <input
        type="text"
        role="searchbox"
        aria-label={`Search ${label.toLowerCase()}`}
        placeholder={placeholder}
        value={value}
        onChange={e => onSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Escape') {
            e.stopPropagation();
          }
        }}
        className={cn(
          'w-full py-2 pr-2 pl-4 text-fg-default outline-none placeholder:text-fg-subtle',
          standalone ? 'rounded-md' : 'rounded-t-md border-b border-line',
        )}
      />
    </div>
  );
}
