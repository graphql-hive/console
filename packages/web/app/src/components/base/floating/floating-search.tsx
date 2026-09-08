import { cn } from '@/lib/utils';

type FloatingSearchProps = {
  label: string;
  onSearch: (value: string) => void;
  value: string;
  placeholder?: string;
  /**
   * The input is the panel's only content, rather than a header above a list.
   *
   * The menu panel is padded `px-2 pb-2` for item rows, and its top spacing
   * comes from `first:mt-2` on those items — which an input never gets. So a
   * lone input sits flush at the top with 8px of dead space beneath it. This
   * cancels that bottom padding the same way `-mx-2` already cancels the
   * horizontal padding, and rounds all four corners to match the panel since
   * there's no list below to divide from.
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
    <div className={cn('relative -mx-2', standalone && '-mb-2')}>
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
          'text-neutral-11 placeholder:text-neutral-8 w-full py-2 pl-4 pr-2 outline-none',
          standalone ? 'rounded-md' : 'border-neutral-5 rounded-t-md border-b',
        )}
      />
    </div>
  );
}
