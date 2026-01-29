import type { Story } from '@ladle/react';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';

export const Default: Story = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="p-4">
      <Calendar mode="single" selected={date} onSelect={setDate} />
    </div>
  );
};

Default.meta = {
  description: 'Single date selection calendar',
};

export const WithoutSelection: Story = () => {
  const [date, setDate] = useState<Date | undefined>(undefined);

  return (
    <div className="p-4">
      <Calendar mode="single" selected={date} onSelect={setDate} />
    </div>
  );
};

WithoutSelection.meta = {
  description: 'Calendar with no date selected',
};

export const RangeSelection: Story = () => {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 20),
    to: new Date(2026, 0, 27),
  });

  return (
    <div className="p-4">
      <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
      {range?.from && (
        <div className="mt-4 p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-neutral-11 text-sm">
            Selected range:{' '}
            {range.from.toLocaleDateString()}
            {range.to ? ` - ${range.to.toLocaleDateString()}` : ''}
          </p>
        </div>
      )}
    </div>
  );
};

RangeSelection.meta = {
  description: 'Date range selection with two months',
};

export const TwoMonths: Story = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="p-4">
      <Calendar mode="single" selected={date} onSelect={setDate} numberOfMonths={2} />
    </div>
  );
};

TwoMonths.meta = {
  description: 'Calendar showing two months side by side',
};

export const WithDisabledDates: Story = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());

  return (
    <div className="p-4">
      <Calendar
        mode="single"
        selected={date}
        onSelect={setDate}
        disabled={(date) =>
          date < new Date() || date > new Date(new Date().setDate(new Date().getDate() + 30))
        }
      />
      <p className="mt-4 text-neutral-11 text-xs">
        Only dates within the next 30 days are selectable
      </p>
    </div>
  );
};

WithDisabledDates.meta = {
  description: 'Calendar with disabled dates (past and future)',
};

export const InTracesFilter: Story = () => {
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 20),
    to: new Date(2026, 0, 27),
  });

  return (
    <div className="p-4 max-w-2xl">
      <div className="mb-4">
        <p className="text-neutral-11 text-sm mb-2">
          Usage example from Traces filter page:
        </p>
        <p className="text-neutral-10 text-xs">
          The calendar is used in a date range picker popover for filtering traces by date.
        </p>
      </div>
      <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
        <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
      </div>
    </div>
  );
};

InTracesFilter.meta = {
  description: 'Real usage: Date range picker in Traces filter',
};

export const ColorPaletteShowcase: Story = () => {
  const [date, setDate] = useState<Date | undefined>(new Date(2026, 0, 15));
  const [range, setRange] = useState<DateRange | undefined>({
    from: new Date(2026, 0, 10),
    to: new Date(2026, 0, 18),
  });

  return (
    <div className="space-y-8 p-8 bg-neutral-2 rounded-lg max-w-6xl">
      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Calendar Component</h2>
        <p className="text-neutral-11 mb-4">
          Date picker calendar built on react-day-picker with custom styling. Supports single date
          selection, range selection, and multiple months. Used in date range pickers for filtering
          traces and other date-related operations.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Single Date Selection</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6 inline-block">
              <Calendar mode="single" selected={date} onSelect={setDate} />
            </div>
            <p className="text-xs text-neutral-10">
              Mode: <code className="text-neutral-12">single</code>
              <br />
              Container: <code className="text-neutral-12">p-3</code>
              <br />
              Chevron buttons:{' '}
              <code className="text-neutral-12">size-7 opacity-50 hover:opacity-100</code>
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Range Selection (Two Months)</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6 inline-block">
              <Calendar mode="range" selected={range} onSelect={setRange} numberOfMonths={2} />
            </div>
            <p className="text-xs text-neutral-10">
              Mode: <code className="text-neutral-12">range</code>
              <br />
              Number of months: <code className="text-neutral-12">numberOfMonths={'{2}'}</code>
              <br />
              Layout: <code className="text-neutral-12">flex-col sm:flex-row</code> (responsive)
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Day States</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-md bg-neutral-11 text-neutral-2 text-sm font-normal">
                  15
                </div>
                <span className="text-xs text-neutral-10">
                  Selected: <code className="text-neutral-12">bg-neutral-11 text-neutral-2</code>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-md bg-accent text-neutral-12 text-sm font-normal">
                  29
                </div>
                <span className="text-xs text-neutral-10">
                  Today: <code className="text-neutral-12">bg-accent text-neutral-12</code>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-md hover:bg-neutral-3 text-neutral-12 text-sm font-normal">
                  10
                </div>
                <span className="text-xs text-neutral-10">
                  Default (hover): <code className="text-neutral-12">hover:bg-neutral-3</code>
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center size-8 rounded-md text-neutral-10 opacity-50 text-sm font-normal">
                  31
                </div>
                <span className="text-xs text-neutral-10">
                  Outside/Disabled: <code className="text-neutral-12">text-neutral-10 opacity-50</code>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Range Selection Colors</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6 space-y-2">
              <div className="flex gap-1">
                <div className="flex items-center justify-center size-8 rounded-l-md bg-neutral-11 text-neutral-2 text-sm font-normal">
                  10
                </div>
                <div className="flex items-center justify-center size-8 bg-accent text-neutral-12 text-sm font-normal">
                  11
                </div>
                <div className="flex items-center justify-center size-8 bg-accent text-neutral-12 text-sm font-normal">
                  12
                </div>
                <div className="flex items-center justify-center size-8 rounded-r-md bg-neutral-11 text-neutral-2 text-sm font-normal">
                  13
                </div>
              </div>
              <p className="text-xs text-neutral-10">
                Range start/end:{' '}
                <code className="text-neutral-12">bg-neutral-11 text-neutral-2</code> with rounded
                corners
                <br />
                Range middle: <code className="text-neutral-12">bg-accent text-neutral-12</code>
                <br />
                Cell background: <code className="text-neutral-12">[&:has([aria-selected])]:bg-accent</code>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Header & Navigation</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <div className="flex justify-center items-center relative py-1">
                <button className="absolute left-1 size-7 rounded-md border border-neutral-6 flex items-center justify-center opacity-50 hover:opacity-100">
                  ‹
                </button>
                <span className="text-sm font-medium text-neutral-12">January 2026</span>
                <button className="absolute right-1 size-7 rounded-md border border-neutral-6 flex items-center justify-center opacity-50 hover:opacity-100">
                  ›
                </button>
              </div>
              <p className="text-xs text-neutral-10 mt-2">
                Caption: <code className="text-neutral-12">text-sm font-medium</code>
                <br />
                Nav buttons:{' '}
                <code className="text-neutral-12">
                  size-7 bg-transparent opacity-50 hover:opacity-100
                </code>
                <br />
                Positioned: <code className="text-neutral-12">absolute left-1 / right-1</code>
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Weekday Headers</p>
            <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
              <div className="flex gap-2">
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                  <div
                    key={day}
                    className="text-neutral-10 w-8 text-center text-xs font-normal"
                  >
                    {day}
                  </div>
                ))}
              </div>
              <p className="text-xs text-neutral-10 mt-2">
                Headers: <code className="text-neutral-12">text-neutral-10 w-8 text-xs</code>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Props</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-xs text-neutral-10 mb-2">
            Extends all react-day-picker DayPicker props. Common props:
          </p>
          <ul className="text-xs space-y-1 text-neutral-10">
            <li>
              <code className="text-neutral-12">mode</code>: "single" | "multiple" | "range" -
              Selection mode
            </li>
            <li>
              <code className="text-neutral-12">selected</code>: Date | DateRange | Date[] -
              Selected date(s)
            </li>
            <li>
              <code className="text-neutral-12">onSelect</code>: (date) =&gt; void - Selection
              handler
            </li>
            <li>
              <code className="text-neutral-12">numberOfMonths</code>: number (optional) - Number of
              months to show
            </li>
            <li>
              <code className="text-neutral-12">disabled</code>: Date | Date[] | function
              (optional) - Disabled dates
            </li>
            <li>
              <code className="text-neutral-12">showOutsideDays</code>: boolean (default: true) -
              Show days from adjacent months
            </li>
            <li>
              <code className="text-neutral-12">className</code>: string (optional) - Additional CSS
              classes
            </li>
            <li>
              <code className="text-neutral-12">classNames</code>: object (optional) - Override
              internal class names
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">DateRange Type</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <p className="text-xs text-neutral-10 mb-2">
            From <code className="text-neutral-12">react-day-picker</code>:
          </p>
          <pre className="text-xs text-neutral-12 bg-neutral-3 p-3 rounded overflow-x-auto">
            {`type DateRange = {
  from: Date | undefined;
  to?: Date | undefined;
}`}
          </pre>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Styling Details</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <ul className="text-xs space-y-2 text-neutral-10">
            <li>
              <strong className="text-neutral-12">Day cells:</strong> <code className="text-neutral-12">size-8 p-0</code> with
              ghost button variant
            </li>
            <li>
              <strong className="text-neutral-12">Selected cells:</strong> Dark background with light text for
              visibility
            </li>
            <li>
              <strong className="text-neutral-12">Today:</strong> Accent background to highlight current date
            </li>
            <li>
              <strong className="text-neutral-12">Range selection:</strong> Accent background for middle days, selected
              colors for endpoints
            </li>
            <li>
              <strong className="text-neutral-12">Outside days:</strong> Lower opacity to differentiate from current
              month
            </li>
            <li>
              <strong className="text-neutral-12">Responsive:</strong> Stacks vertically on mobile, horizontal on
              desktop
            </li>
            <li>
              <strong className="text-neutral-12">Focus rings:</strong> Radix UI focus-visible styles applied
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Usage Patterns</h2>
        <div className="space-y-4">
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Date Range Picker</p>
            <p className="text-neutral-10 text-xs">
              Used within DateRangePicker component for selecting date ranges in filters (traces,
              analytics, etc.)
            </p>
          </div>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">Popover Context</p>
            <p className="text-neutral-10 text-xs">
              Typically rendered inside a Popover component triggered by a button or input field
            </p>
          </div>
          <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
            <p className="text-neutral-11 text-sm font-medium mb-2">State Management</p>
            <p className="text-neutral-10 text-xs">
              Controlled component - requires external state management via useState or form
              libraries
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 text-xl font-bold mb-4">Implementation Details</h2>
        <div className="p-4 bg-neutral-1 rounded border border-neutral-6">
          <ul className="text-xs space-y-2 text-neutral-10">
            <li>
              Built on <code className="text-neutral-12">react-day-picker</code> library
            </li>
            <li>
              Custom icons from <code className="text-neutral-12">@radix-ui/react-icons</code>:{' '}
              ChevronLeftIcon, ChevronRightIcon
            </li>
            <li>
              Button styles from <code className="text-neutral-12">buttonVariants</code> (CVA)
            </li>
            <li>
              Extensive classNames customization for all DayPicker elements
            </li>
            <li>
              Uses Tailwind utility classes with conditional logic for range mode
            </li>
            <li>
              Complex selector logic for aria-selected states and range highlighting
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
