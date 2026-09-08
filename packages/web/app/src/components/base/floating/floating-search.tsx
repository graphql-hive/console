import { cn } from '@/lib/utils';

type FloatingSearchProps = {
  label: string;
  onSearch: (value: string) => void;
  value: string;
  placeholder?: string;
  /**
   * The rule separating the input from the list beneath it. Turn it off when
   * the input is the panel's only content, where it would divide nothing.
   */
  withDivider?: boolean;
};

export function FloatingSearch({
  label,
  onSearch,
  value,
  placeholder = 'Search...',
  withDivider = true,
}: FloatingSearchProps) {
  return (
    <div className="relative -mx-2">
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
          'text-neutral-11 placeholder:text-neutral-8 w-full rounded-t-md py-2 pl-4 pr-2 outline-none',
          withDivider && 'border-neutral-5 border-b',
        )}
      />
    </div>
  );
}
