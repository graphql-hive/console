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
import { addDays, formatDate, setHours, setMinutes } from 'date-fns';
import debounce from 'lodash.debounce';
import {
  CalendarIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleXIcon,
  MinusIcon,
  PlusIcon,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { findMatchingPreset, Preset } from '@/components/ui/date-range-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { formatNumber } from '@/lib/hooks';
import { useResetState } from '@/lib/hooks/use-reset-state';
import { cn } from '@/lib/utils';
import * as SliderPrimitive from '@radix-ui/react-slider';
import * as dateMath from '../../lib/date-math';

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
        <FilterTitle
          changes={props.selectedValues.length}
          children={props.name}
          onReset={() => props.onChange([])}
        />
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
              className="h-9 w-9 p-0"
              type="submit"
              onClick={() => {
                addTraceId();
              }}
            >
              <PlusIcon className="size-4" />
            </Button>
          </form>
          {props.selectedValues.map(value => (
            <SidebarMenuButton
              key={value}
              onClick={() => props.onChange(props.selectedValues.filter(val => val !== value))}
              className="group/trace-id hover:bg-sidebar-accent/50"
            >
              <div
                data-active
                className="text-sidebar-primary-foreground border-sidebar-primary bg-sidebar-primary group-hover/trace-id:border-sidebar-border flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border group-hover/trace-id:bg-transparent"
              >
                <CheckIcon className="block size-3 group-hover/trace-id:hidden" />
                <MinusIcon className="hidden size-3 group-hover/trace-id:block" />
              </div>
              {value}
            </SidebarMenuButton>
          ))}
        </FilterContent>
      </Filter>
    );
  },
);

export const MultiSelectFilter = memo(function <$Value>(props: {
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
      <FilterTitle
        changes={props.selectedValues.length}
        children={props.name}
        onReset={() => props.onChange([])}
      />
      <FilterContent>
        {!props.hideSearch && <FilterLocalSearch value={searchPhrase} onChange={setSearchPhrase} />}
        {filteredOptions.map((option, index) => (
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
            {option.label}
          </FilterOption>
        ))}
      </FilterContent>
    </Filter>
  );
});

function FilterOption(props: {
  onClick(): void;
  selected: boolean;
  children: ReactNode;
  count?: number;
}) {
  return (
    <SidebarMenuButton
      onClick={props.onClick}
      className="hover:bg-sidebar-accent/50 flex-row items-center justify-between"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        <div
          data-active={props.selected}
          className="group/filter-item border-sidebar-border text-sidebar-primary-foreground data-[active=true]:border-sidebar-primary data-[active=true]:bg-sidebar-primary flex aspect-square size-4 shrink-0 items-center justify-center rounded-sm border"
        >
          <CheckIcon className="hidden size-3 group-data-[active=true]/filter-item:block" />
        </div>
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
    <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-800">
      <SliderPrimitive.Range className="absolute h-full bg-gray-400" />
    </SliderPrimitive.Track>
    {props.value?.map((_, index) => (
      <SliderPrimitive.Thumb
        key={index}
        className="block h-4 w-4 rounded-full border border-gray-700 bg-gray-800 transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
      />
    ))}
  </SliderPrimitive.Root>
));

export const DurationFilter = memo(
  (props: { value: [number, number] | []; onChange(value: [number, number]): void }) => {
    const minValue = 0;
    const maxValue = 100000;
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
          children={'Duration'}
          onReset={() => props.onChange(defaultValues)}
        />
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
                    className="h-7 border-zinc-800 bg-transparent px-2 pr-8 font-mono text-white"
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
                    className="h-7 border-gray-800 bg-transparent px-2 pr-8 font-mono text-white"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-xs text-gray-400">
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
              className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
            />
          </div>
        </FilterContent>
      </Filter>
    );
  },
);

const availableTimelineFilterPresets: Array<Preset> = [
  { name: 'last5m', label: 'Last 5 minutes', range: { from: 'now-5m', to: 'now' } },
  { name: 'last1hour', label: 'Last 1 hour', range: { from: 'now-1h', to: 'now' } },
  { name: 'last3hours', label: 'Last 3 hours', range: { from: 'now-3h', to: 'now' } },
  { name: 'last12hours', label: 'Last 12 hours', range: { from: 'now-12h', to: 'now' } },
  { name: 'last24hours', label: 'Last 24 hours', range: { from: 'now-24h', to: 'now' } },
];

export const TimelineFilter = memo(
  (props: { value: [string, string] | []; onChange(value: [string, string] | []): void }) => {
    const selectedPreset = useMemo<Preset | null>(() => {
      if (!props.value.length) {
        return null;
      }

      return (
        findMatchingPreset(
          {
            from: props.value[0],
            to: props.value[1],
          },
          availableTimelineFilterPresets,
        ) ?? {
          name: 'custom',
          label: 'Custom',
          range: {
            from: props.value[0],
            to: props.value[1],
          },
        }
      );
    }, [props.value]);

    const [isRangeSelectorPopupOpen, setIsRangeSelectorPopupOpen] = useState(false);

    const [dateRange, setDateRange] = useResetState<DateRange | undefined>(
      () =>
        selectedPreset?.name === 'custom'
          ? {
              from: new Date(selectedPreset.range.from),
              to: new Date(selectedPreset.range.to),
            }
          : {
              from: addDays(new Date(), -3),
              to: new Date(),
            },
      [props.value[0], props.value[1], isRangeSelectorPopupOpen],
    );

    const formatted = useMemo(() => {
      if (!dateRange?.from || !dateRange.to || selectedPreset?.name !== 'custom') {
        return 'Select time period';
      }

      const fromDate = formatDate(dateRange.from, 'MMM d');
      const fromTime = formatDate(dateRange.from, 'HH:mm');
      const toDate = formatDate(dateRange.to, 'MMM d');
      const toTime = formatDate(dateRange.to, 'HH:mm');

      if (fromDate === toDate) {
        return `${fromDate}, ${fromTime} - ${toTime}`;
      }

      return `${fromDate}, ${fromTime} - ${toDate}, ${toTime}`;
    }, [dateRange, selectedPreset]);

    return (
      <Filter name="Timeline">
        <FilterTitle
          changes={props.value.length ? 1 : 0}
          children={'Timeline'}
          onReset={() => props.onChange([])}
        />
        <FilterContent>
          <div className="space-y-2 p-2">
            <Select
              value={selectedPreset?.name ?? undefined}
              onValueChange={value => {
                if (value === 'custom') {
                  const preset = selectedPreset ?? availableTimelineFilterPresets[0];
                  props.onChange([
                    dateMath.parse(preset.range.from)?.toISOString() ?? new Date().toISOString(),
                    dateMath.parse(preset.range.to)?.toISOString() ?? new Date().toISOString(),
                  ]);
                  return;
                }
                const preset = availableTimelineFilterPresets.find(preset => preset.name === value);
                if (preset) {
                  props.onChange([preset.range.from, preset.range.to]);
                }
              }}
            >
              <SelectTrigger className="bg-background w-full">
                <SelectValue placeholder="Select time period" />
              </SelectTrigger>
              <SelectContent>
                {availableTimelineFilterPresets.map(preset => (
                  <SelectItem value={preset.name} key={preset.name}>
                    {preset.label}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
            {selectedPreset?.name === 'custom' ? (
              <>
                <Popover
                  open={isRangeSelectorPopupOpen}
                  onOpenChange={isOpen => {
                    setIsRangeSelectorPopupOpen(isOpen);
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start px-2 text-left">
                      <CalendarIcon className="mr-2 size-4" />{' '}
                      <span className="text-xs">{formatted}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="center">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={1}
                      className="p-2 pb-0"
                    />
                    <div className="border-border mt-4 space-y-2 border-t p-2">
                      <div>
                        <Label className="text-sm font-normal text-gray-500">Start</Label>
                        <div className="flex items-center gap-x-2">
                          <Input
                            className="h-8 w-[152px] py-0"
                            value={dateRange?.from ? formatDate(dateRange.from, 'yyyy-MM-dd') : ''}
                          />
                          <Input
                            className="h-8 w-16 py-0"
                            value={dateRange?.from ? formatDate(dateRange.from, 'HH:mm') : ''}
                            type="time"
                            min="00:00"
                            max="23:59"
                            onChange={ev => {
                              setDateRange(range =>
                                range
                                  ? {
                                      ...range,
                                      from: setMinutes(
                                        setHours(
                                          range.from ?? new Date(),
                                          parseInt(ev.target.value.substr(0, 2)),
                                        ),
                                        parseInt(ev.target.value.substr(3, 5)),
                                      ),
                                    }
                                  : undefined,
                              );
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <Label className="text-sm font-normal text-gray-500">End</Label>
                        <div className="flex items-center gap-x-2">
                          <Input
                            className="h-8 w-[152px] py-0"
                            value={dateRange?.to ? formatDate(dateRange.to, 'yyyy-MM-dd') : ''}
                          />
                          <Input
                            className="h-8 w-16 py-0"
                            value={dateRange?.to ? formatDate(dateRange.to, 'HH:mm') : ''}
                            type="time"
                            min="00:00"
                            max="23:59"
                            onChange={ev => {
                              setDateRange(range =>
                                range
                                  ? {
                                      ...range,
                                      to: setMinutes(
                                        setHours(
                                          range.to ?? new Date(),
                                          parseInt(ev.target.value.substr(0, 2)),
                                        ),
                                        parseInt(ev.target.value.substr(3, 5)),
                                      ),
                                    }
                                  : undefined,
                              );
                            }}
                          />
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          if (!dateRange?.from || !dateRange.to) {
                            return;
                          }
                          props.onChange([
                            dateRange.from.toISOString(),
                            dateRange.to.toISOString(),
                          ]);
                          setIsRangeSelectorPopupOpen(false);
                        }}
                      >
                        <span className="relative">
                          Apply
                          <span className="absolute top-[4px] ml-2 text-xs">↵</span>
                        </span>
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            ) : null}
          </div>
        </FilterContent>
      </Filter>
    );
  },
);
