import {
  forwardRef,
  Fragment,
  InputHTMLAttributes,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';
import { CheckIcon, ChevronRightIcon, CircleXIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface FilterInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const FilterInput = forwardRef<HTMLInputElement, FilterInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'border-input placeholder:text-muted-foreground focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

export function FilterSearch(props: { value: string; onChange(value: string): void }) {
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange(e.target.value);
  }, []);

  return (
    <div className="mt-4 flex w-full max-w-sm items-center space-x-2">
      <FilterInput
        type="text"
        placeholder="Search values"
        value={props.value}
        onChange={handleChange}
      />
    </div>
  );
}

export function FilterTitle(props: { children: ReactNode; changes?: number; onReset(): void }) {
  return (
    <SidebarGroupLabel
      asChild
      className="group/label text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full text-sm"
    >
      <CollapsibleTrigger>
        <ChevronRightIcon className="mr-2 transition-transform group-data-[state=open]/collapsible:rotate-90" />
        {props.children}
        {props.changes ? (
          <Button
            variant="secondary"
            size="sm"
            className="hover:bg-secondary group ml-auto h-6 w-8 px-1 py-0 text-xs text-gray-500"
            onClick={e => {
              e.preventDefault();
              props.onReset();
            }}
          >
            <CircleXIcon className="hidden size-3 group-hover:block" />
            <span className="block group-hover:hidden">{props.changes}</span>
          </Button>
        ) : null}
      </CollapsibleTrigger>
    </SidebarGroupLabel>
  );
}

export function FilterContent(props: { children: ReactNode }) {
  return (
    <CollapsibleContent>
      <SidebarGroupContent>
        <SidebarMenu>{props.children}</SidebarMenu>
      </SidebarGroupContent>
    </CollapsibleContent>
  );
}

export function MultiSelectFilter<$Value extends string | number>(props: {
  name: string;
  /**
   * Filter's key for the backend and url state
   */
  key: string;
  hideSearch?: boolean;
  options: Array<{
    /**
     * What to display
     */
    label: ReactNode;
    /**
     * What to use when searching
     */
    searchContent: string;
    /**
     * A value to use when the filter is selected
     */
    value: $Value;
  }>;
  selectedValues: $Value[];
  onChange(selectedValues: $Value[]): void;
}) {
  const [searchPhrase, setSearchPhrase] = useState('');
  const filteredOptions = useMemo(() => {
    const lowerSearchPhrase = searchPhrase.toLowerCase().trim();

    if (!lowerSearchPhrase) {
      return props.options;
    }

    return props.options.filter(option =>
      option.searchContent.toLowerCase().includes(lowerSearchPhrase),
    );
  }, [searchPhrase]);

  return (
    <Filter name={props.name}>
      <FilterTitle
        changes={props.selectedValues.length}
        children={props.name}
        onReset={() => props.onChange([])}
      />
      <FilterContent>
        {!props.hideSearch && <FilterSearch value={searchPhrase} onChange={setSearchPhrase} />}
        {filteredOptions.map((option, index) => (
          <FilterOption
            key={index}
            selected={props.selectedValues.includes(option.value)}
            onClick={() => {
              if (props.selectedValues.includes(option.value)) {
                props.onChange(props.selectedValues.filter(val => val !== option.value));
              } else {
                props.onChange(props.selectedValues.concat(option.value));
              }
            }}
          >
            {option.label}
          </FilterOption>
        ))}
      </FilterContent>
    </Filter>
  );
}

function FilterOption(props: { onClick(): void; selected: boolean; children: ReactNode }) {
  return (
    <SidebarMenuButton onClick={props.onClick}>
      <div
        data-active={props.selected}
        className="group/filter-item border-sidebar-border text-sidebar-primary-foreground data-[active=true]:border-sidebar-primary data-[active=true]:bg-sidebar-primary flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border"
      >
        <CheckIcon className="hidden size-3 group-data-[active=true]/filter-item:block" />
      </div>
      {props.children}
    </SidebarMenuButton>
  );
}

function Filter(props: { name: string; children: ReactNode }) {
  return (
    <Fragment key={props.name}>
      <SidebarGroup key={props.name} className="py-0">
        <Collapsible className="group/collapsible">{props.children}</Collapsible>
      </SidebarGroup>
      <SidebarSeparator className="mx-0" />
    </Fragment>
  );
}
