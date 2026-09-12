import {
  ChangeEventHandler,
  ComponentPropsWithoutRef,
  ElementRef,
  forwardRef,
  Fragment,
  InputHTMLAttributes,
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import debounce from 'lodash.debounce';
import { ChevronRightIcon, CircleXIcon, PlusIcon } from 'lucide-react';
import { Checkbox } from '@/components/base/checkbox/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { formatNumber } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';

type FilterInputProps = InputHTMLAttributes<HTMLInputElement>;

export const FilterInput = forwardRef<HTMLInputElement, FilterInputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'border-neutral-5 placeholder:text-neutral-10 focus-visible:ring-ring flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-1 disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

export function FilterLocalSearch(props: { value: string; onChange(value: string): void }) {
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
      className="group/label text-neutral-11 hover:bg-neutral-5 hover:text-neutral-11 w-full text-sm"
    >
      <CollapsibleTrigger>
        <ChevronRightIcon className="mr-2 transition-transform group-data-[state=open]/collapsible:rotate-90" />
        {props.children}
        {props.changes ? (
          <Button
            variant="secondary"
            size="sm"
            className="hover:bg-neutral-2 text-neutral-10 group ml-auto h-6 w-8 px-1 py-0 text-xs"
            onClick={e => {
              e.preventDefault();
              props.onReset();
            }}
            asChild
          >
            <div>
              <CircleXIcon className="hidden size-3 group-hover:block" />
              <span className="block group-hover:hidden">{props.changes}</span>
            </div>
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

export const MultiInputFilter = memo(
  (props: {
    name: string;
    /**
     * Filter's key for the backend and url state
     */
    key: string;
    selectedValues: string[];
    onChange(selectedValues: string[]): void;
  }) => {
    const [traceId, setTraceId] = useState('');
    const handleTraceIdChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        setTraceId(e.target.value);
      },
      [setTraceId],
    );

    const addTraceId = useCallback(() => {
      if (!traceId) {
        return;
      }

      if (!props.selectedValues.includes(traceId)) {
        props.onChange(props.selectedValues.concat(traceId));
      }

      setTraceId('');
    }, [traceId, setTraceId]);

    return (
      <Filter name={props.name}>
        <FilterTitle changes={props.selectedValues.length} onReset={() => props.onChange([])}>
          {props.name}
        </FilterTitle>
        <FilterContent>
          <form
            className="mt-4 flex w-full max-w-sm items-center space-x-2"
            onSubmit={e => {
              e.preventDefault();
              addTraceId();
            }}
          >
            <FilterInput
              type="text"
              placeholder="Trace ID..."
              value={traceId}
              onChange={handleTraceIdChange}
            />
            <Button
              variant="secondary"
              className="size-9 p-0"
              type="submit"
              onClick={() => {
                addTraceId();
              }}
            >
              <PlusIcon className="size-4" />
            </Button>
          </form>
          {props.selectedValues.map(value => (
            <MultiInputFilterValue
              key={value}
              value={value}
              onRemove={() => props.onChange(props.selectedValues.filter(val => val !== value))}
            />
          ))}
        </FilterContent>
      </Filter>
    );
  },
);

function MultiInputFilterValue(props: { value: string; onRemove(): void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <SidebarMenuButton
      onClick={props.onRemove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="hover:bg-neutral-5/50"
    >
      <Checkbox visual checked indeterminate={hovered} size="sm" />
      {props.value}
    </SidebarMenuButton>
  );
}

export const MultiSelectFilter = function MultiSelectFilter<$Value>(props: {
  name: string;
  /**
   * Filter's key for the backend and url state
   */
  key: string;
  hideSearch?: boolean;
  options: Array<{
    /**
     * How often it occurs
     */
    count: number;
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
  }, [searchPhrase, props.options]);

  return (
    <Filter name={props.name}>
      <FilterTitle changes={props.selectedValues.length} onReset={() => props.onChange([])}>
        {props.name}
      </FilterTitle>
      <FilterContent>
        {!props.hideSearch && !!filteredOptions.length && (
          <FilterLocalSearch value={searchPhrase} onChange={setSearchPhrase} />
        )}
        {filteredOptions.length === 0 ? (
          <div className="text-neutral-8 text-center text-sm">No option available</div>
        ) : (
          filteredOptions.map((option, index) => (
            <FilterOption
              key={index}
              selected={props.selectedValues.includes(option.value)}
              count={option.count}
              onClick={() => {
                if (props.selectedValues.includes(option.value)) {
                  props.onChange(props.selectedValues.filter(val => val !== option.value));
                } else {
                  props.onChange(props.selectedValues.concat(option.value));
                }
              }}
            >
              {option.label === '' ? (
                <span className="text-neutral-10">{'<unknown>'}</span>
              ) : (
                option.label
              )}
            </FilterOption>
          ))
        )}
      </FilterContent>
    </Filter>
  );
};

function FilterOption(props: {
  onClick(): void;
  selected: boolean;
  children: ReactNode;
  count?: number;
}) {
  return (
    <SidebarMenuButton
      onClick={props.onClick}
      className="hover:bg-neutral-5/50 flex-row items-center justify-between"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <Checkbox visual checked={props.selected} size="sm" />
        {props.children}
      </div>
      {props.count ? (
        <Badge variant="secondary" className="rounded-sm px-1 font-mono font-normal">
          {formatNumber(props.count)}
        </Badge>
      ) : null}
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

const DoubleSlider = forwardRef<
  ElementRef<typeof SliderPrimitive.Root>,
  ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="bg-neutral-5 relative h-1 w-full grow overflow-hidden rounded-full">
      <SliderPrimitive.Range className="bg-neutral-10 absolute h-full" />
    </SliderPrimitive.Track>
    {props.value?.map((_, index) => (
      <SliderPrimitive.Thumb
        key={index}
        className="bg-neutral-5 border-neutral-2 block size-4 rounded-full border transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      />
    ))}
  </SliderPrimitive.Root>
));

export const DurationFilter = memo(
  (props: { value: [number, number] | []; onChange(value: [number, number]): void }) => {
    const minValue = 0;
    const maxValue = 100_000;
    const defaultValues: [number, number] = [minValue, maxValue];
    const [values, setValues] = useState<[number, number]>(
      props.value.length ? props.value : defaultValues,
    );

    const handleStateChange = useMemo(
      () =>
        debounce((newValues: [number, number]) => {
          props.onChange(newValues);
        }, 1000),
      [props.onChange],
    );

    const handleSliderChange = useCallback(
      (newValues: [number, number]) => {
        handleStateChange(newValues);
        setValues(newValues);
      },
      [handleStateChange, setValues],
    );

    useEffect(() => {
      return () => handleStateChange.cancel();
    }, [handleStateChange]);

    const handleInputChange = useCallback(
      (index: number, value: string) => {
        const numValue = Number.parseInt(value) || minValue;
        const newValues: [number, number] = [...values];
        newValues[index] = Math.min(Math.max(numValue, minValue), maxValue);

        handleStateChange(newValues);
        setValues(newValues);
      },
      [handleStateChange, setValues],
    );

    const handleMinInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
      e => handleInputChange(0, e.target.value),
      [handleInputChange],
    );

    const handleMaxInputChange = useCallback<ChangeEventHandler<HTMLInputElement>>(
      e => handleInputChange(1, e.target.value),
      [handleInputChange],
    );

    return (
      <Filter name="Duration">
        <FilterTitle
          changes={values[0] === minValue && values[1] === maxValue ? 0 : 1}
          onReset={() => props.onChange(defaultValues)}
        >
          Duration
        </FilterTitle>
        <FilterContent>
          <div className="space-y-6 p-2">
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="font-mono text-xs text-zinc-400">MIN</label>
                <div className="relative">
                  <FilterInput
                    type="number"
                    value={values[0]}
                    onChange={handleMinInputChange}
                    className="text-neutral-12 h-7 border-zinc-800 bg-transparent px-2 pr-8 font-mono"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-zinc-400">
                    ms
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-xs text-zinc-400">MAX</label>
                <div className="relative">
                  <FilterInput
                    type="number"
                    value={values[1]}
                    onChange={handleMaxInputChange}
                    className="border-neutral-5 text-neutral-12 h-7 bg-transparent px-2 pr-8 font-mono"
                  />
                  <span className="text-neutral-10 absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs">
                    ms
                  </span>
                </div>
              </div>
            </div>
            <DoubleSlider
              defaultValue={defaultValues}
              max={maxValue}
              min={minValue}
              step={1}
              value={values}
              onValueChange={handleSliderChange}
              className="**:[[role=slider]]:size-4"
            />
          </div>
        </FilterContent>
      </Filter>
    );
  },
);
