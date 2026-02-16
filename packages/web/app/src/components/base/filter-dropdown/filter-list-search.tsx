type FilterListSearchProps = {
  label: string;
  onSearch: (value: React.SetStateAction<string>) => void;
  value: string;
};

export function FilterListSearch({ label, onSearch, value }: FilterListSearchProps) {
  return (
    <div className="relative">
      <input
        type="text"
        role="searchbox"
        aria-label={`Search ${label.toLowerCase()}`}
        placeholder="Search..."
        value={value}
        onChange={e => onSearch(e.target.value)}
        onKeyDown={e => {
          if (e.key !== 'Escape') {
            e.stopPropagation();
          }
        }}
        className="border-neutral-5 text-neutral-11 placeholder:text-neutral-8 w-full rounded-t-md border-b py-1.5 pl-4 pr-2 outline-none"
      />
    </div>
  );
}
