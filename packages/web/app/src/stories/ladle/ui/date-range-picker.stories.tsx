import { useState } from 'react';
import {
  availablePresets,
  DateRangePicker,
  presetLast7Days,
  type Preset,
} from '@/components/ui/date-range-picker';
import type { Story } from '@ladle/react';

export default {
  title: 'UI / Date Range Picker',
};

export const Default: Story = () => {
  const [selectedRange, setSelectedRange] = useState(presetLast7Days.range);

  return (
    <div className="p-4">
      <DateRangePicker
        selectedRange={selectedRange}
        onUpdate={({ preset }) => setSelectedRange(preset.range)}
      />
      <div className="bg-neutral-1 border-neutral-6 mt-4 rounded-sm border p-4">
        <p className="text-neutral-11 mb-1 text-sm">Selected range:</p>
        <p className="text-neutral-12 font-mono text-sm">
          {selectedRange.from} → {selectedRange.to}
        </p>
      </div>
    </div>
  );
};

Default.meta = {
  description: 'Date range picker with default presets',
};

export const CustomPresets: Story = () => {
  const customPresets: Preset[] = [
    { name: 'last1h', label: 'Last 1 hour', range: { from: 'now-1h', to: 'now' } },
    { name: 'last6h', label: 'Last 6 hours', range: { from: 'now-6h', to: 'now' } },
    { name: 'last24h', label: 'Last 24 hours', range: { from: 'now-1d', to: 'now' } },
    { name: 'last7d', label: 'Last 7 days', range: { from: 'now-7d', to: 'now' } },
  ];

  const [selectedRange, setSelectedRange] = useState(customPresets[2].range);

  return (
    <div className="p-4">
      <DateRangePicker
        presets={customPresets}
        selectedRange={selectedRange}
        onUpdate={({ preset }) => setSelectedRange(preset.range)}
      />
      <div className="bg-neutral-1 border-neutral-6 mt-4 rounded-sm border p-4">
        <p className="text-neutral-11 mb-2 text-sm">Custom presets (limited to 4 options)</p>
        <p className="text-neutral-12 font-mono text-sm">
          {selectedRange.from} → {selectedRange.to}
        </p>
      </div>
    </div>
  );
};

CustomPresets.meta = {
  description: 'Date range picker with custom presets',
};

export const WithStartDate: Story = () => {
  const startDate = new Date(2025, 11, 1); // December 1, 2025
  const [selectedRange, setSelectedRange] = useState(presetLast7Days.range);

  return (
    <div className="max-w-2xl p-4">
      <div className="bg-neutral-1 border-neutral-6 mb-4 rounded-sm border p-4">
        <p className="text-neutral-11 mb-1 text-sm">Start date limitation:</p>
        <p className="text-neutral-10 text-xs">
          Cannot select ranges before December 1, 2025. Presets that go before this date are
          disabled.
        </p>
      </div>
      <DateRangePicker
        startDate={startDate}
        selectedRange={selectedRange}
        onUpdate={({ preset }) => setSelectedRange(preset.range)}
      />
    </div>
  );
};

WithStartDate.meta = {
  description: 'Date range picker with minimum start date',
};

export const LimitedUnits: Story = () => {
  const [selectedRange, setSelectedRange] = useState<{ from: string; to: string }>({
    from: 'now-1d',
    to: 'now',
  });

  return (
    <div className="max-w-2xl p-4">
      <div className="bg-neutral-1 border-neutral-6 mb-4 rounded-sm border p-4">
        <p className="text-neutral-11 mb-1 text-sm">Valid units: hours and days only</p>
        <p className="text-neutral-10 text-xs">
          Only presets using 'h' (hours) and 'd' (days) are shown. Minutes, weeks, months, and years
          are filtered out.
        </p>
      </div>
      <DateRangePicker
        validUnits={['h', 'd']}
        selectedRange={selectedRange}
        onUpdate={({ preset }) => setSelectedRange(preset.range)}
      />
    </div>
  );
};

LimitedUnits.meta = {
  description: 'Date range picker with limited time units',
};

export const AbsoluteDateRange: Story = () => {
  const [selectedRange, setSelectedRange] = useState<{ from: string; to: string }>({
    from: '2026-01-15T00:00:00',
    to: '2026-01-20T23:59:59',
  });

  return (
    <div className="max-w-2xl p-4">
      <div className="bg-neutral-1 border-neutral-6 mb-4 rounded-sm border p-4">
        <p className="text-neutral-11 mb-2 text-sm">Absolute date range example:</p>
        <p className="text-neutral-10 text-xs">
          When you select an absolute range (not a preset like "Last 7 days"), the button shows the
          formatted date range instead of a preset label.
        </p>
      </div>
      <DateRangePicker
        selectedRange={selectedRange}
        onUpdate={({ preset }) => setSelectedRange(preset.range)}
      />
      <div className="bg-neutral-1 border-neutral-6 mt-4 rounded-sm border p-4">
        <p className="text-neutral-12 font-mono text-sm">
          {selectedRange.from} → {selectedRange.to}
        </p>
      </div>
    </div>
  );
};

AbsoluteDateRange.meta = {
  description: 'Date range picker showing absolute date range',
};

export const InTracesContext: Story = () => {
  const [selectedRange, setSelectedRange] = useState(presetLast7Days.range);

  return (
    <div className="max-w-2xl p-4">
      <div className="mb-4">
        <p className="text-neutral-11 mb-2 text-sm">Usage example from Traces filter page:</p>
        <p className="text-neutral-10 text-xs">
          The date range picker is used to filter trace data by time period. Click the button to see
          the popover with presets and absolute date inputs.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-neutral-11 text-sm">Time range:</span>
        <DateRangePicker
          selectedRange={selectedRange}
          onUpdate={({ preset }) => setSelectedRange(preset.range)}
        />
      </div>
    </div>
  );
};

InTracesContext.meta = {
  description: 'Real usage: Date range picker in Traces filter',
};

export const ColorPaletteShowcase: Story = () => {
  const [selectedRange, setSelectedRange] = useState(presetLast7Days.range);

  return (
    <div className="bg-neutral-2 max-w-6xl space-y-8 rounded-lg p-8">
      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">DateRangePicker Component</h2>
        <p className="text-neutral-11 mb-4">
          Complex date range selection component with preset quick ranges and absolute date input.
          Features dynamic "Last X days/hours/minutes" generation, calendar popup, and date math
          parsing (e.g., "now-7d"). Used in traces filtering and analytics.
        </p>

        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Trigger Button</p>
            <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
              <DateRangePicker
                selectedRange={selectedRange}
                onUpdate={({ preset }) => setSelectedRange(preset.range)}
              />
            </div>
            <p className="text-neutral-10 text-xs">
              Button: <code className="text-neutral-12">variant="outline"</code>
              <br />
              Label: Shows preset label or formatted absolute date range
              <br />
              Chevron: <code className="text-neutral-12">scale-125 pl-1 opacity-60</code> (ChevronUp
              when open, ChevronDown when closed)
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Popover Structure</p>
            <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
              <ul className="text-neutral-10 space-y-1 text-xs">
                <li>
                  1. <strong className="text-neutral-12">Left side:</strong> Absolute date range
                  inputs (From + To with calendar buttons)
                </li>
                <li>
                  2. <strong className="text-neutral-12">Border:</strong> Vertical separator{' '}
                  <code className="text-neutral-12">border-l ml-3</code>
                </li>
                <li>
                  3. <strong className="text-neutral-12">Right side:</strong> Filter input +
                  scrollable preset list
                </li>
                <li>
                  4. <strong className="text-neutral-12">Calendar overlay:</strong> Appears to left
                  when calendar button clicked
                </li>
              </ul>
              <p className="text-neutral-10 mt-2 text-xs">
                Popover: <code className="text-neutral-12">h-[380px] w-auto p-0</code>
                <br />
                Modal: <code className="text-neutral-12">modal</code> prop (blocks background
                interaction)
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Preset List</p>
            <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
              <div className="max-w-xs space-y-1">
                <div className="border-neutral-6 bg-neutral-1 text-neutral-12 rounded-sm border px-3 py-2 text-sm">
                  Last 15 minutes
                </div>
                <div className="text-neutral-12 hover:bg-neutral-3 rounded-sm px-3 py-2 text-sm">
                  Last 30 minutes
                </div>
                <div className="text-neutral-12 hover:bg-neutral-3 rounded-sm px-3 py-2 text-sm">
                  Last 1 hour
                </div>
                <div className="text-neutral-10 cursor-not-allowed rounded-sm px-3 py-2 text-sm opacity-50">
                  Last 6 months (disabled)
                </div>
              </div>
              <p className="text-neutral-10 mt-3 text-xs">
                Buttons:{' '}
                <code className="text-neutral-12">variant="ghost" w-full justify-start</code>
                <br />
                Scrollable:{' '}
                <code className="text-neutral-12">overflow-y-scroll flex-1 pb-2 pt-1</code>
                <br />
                Disabled: When range goes before startDate prop
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Absolute Date Inputs</p>
            <div className="bg-neutral-1 border-neutral-6 space-y-3 rounded-sm border p-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">From</label>
                <div className="relative">
                  <input
                    type="text"
                    value="now-7d"
                    readOnly
                    className="border-neutral-5 text-neutral-12 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
                  />
                  <button className="text-neutral-11 absolute right-2 top-1/2 size-6 -translate-y-1/2">
                    📅
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">To</label>
                <div className="relative">
                  <input
                    type="text"
                    value="now"
                    readOnly
                    className="border-neutral-5 text-neutral-12 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm"
                  />
                  <button className="text-neutral-11 absolute right-2 top-1/2 size-6 -translate-y-1/2">
                    📅
                  </button>
                </div>
              </div>
              <button className="bg-neutral-3 text-neutral-12 hover:bg-neutral-4 w-full rounded-md py-2 text-sm">
                Apply date range
              </button>
            </div>
            <p className="text-neutral-10 text-xs">
              Labels: <code className="text-neutral-12">text-xs text-gray-400</code>
              <br />
              Inputs: <code className="text-neutral-12">font-mono</code> for date strings
              <br />
              Calendar button:{' '}
              <code className="text-neutral-12">absolute right-2 size-6 variant="ghost"</code>
              <br />
              Apply button: Disabled if invalid dates or unchanged
              <br />
              Error text: <code className="text-neutral-12">text-red-500</code> below inputs
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Quick Range Filter</p>
            <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
              <div className="relative">
                <span className="absolute left-2 top-1/2 -translate-y-1/2">🔍</span>
                <input
                  type="text"
                  placeholder="Filter quick ranges"
                  className="border-neutral-5 text-neutral-12 placeholder:text-neutral-10 w-full rounded-md border bg-transparent py-2 pl-7 pr-3 text-sm"
                />
              </div>
              <p className="text-neutral-10 mt-2 text-xs">
                Icon: <code className="text-neutral-12">MagnifyingGlassIcon absolute left-2</code>
                <br />
                Input: <code className="text-neutral-12">pl-7</code> to accommodate icon
                <br />
                Dynamic generation: Typing a number generates "Last X" presets for all valid units
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-neutral-11 text-sm font-medium">Interactive Example</p>
            <div className="bg-neutral-1 border-neutral-6 flex justify-center rounded-sm border p-4">
              <DateRangePicker
                selectedRange={selectedRange}
                onUpdate={({ preset }) => setSelectedRange(preset.range)}
              />
            </div>
            <p className="text-neutral-10 text-xs">
              Click to open popover. Try:
              <br />• Selecting a preset from the list
              <br />• Typing a number in the filter (e.g., "5" generates "Last 5 hours", "Last 5
              days", etc.)
              <br />• Clicking the calendar button to pick absolute dates
              <br />• Editing the From/To inputs directly
            </p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Props</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-10 space-y-2 text-xs">
            <li>
              <code className="text-neutral-12">presets</code>: Preset[] (optional) - Array of quick
              range presets (defaults to availablePresets)
            </li>
            <li>
              <code className="text-neutral-12">selectedRange</code>:{' '}
              {`{ from: string; to: string }`} | null (optional) - Active selected range
            </li>
            <li>
              <code className="text-neutral-12">onUpdate</code>: (values: {`{ preset: Preset }`})
              =&gt; void (optional) - Callback when range is applied
            </li>
            <li>
              <code className="text-neutral-12">align</code>: "start" | "center" | "end" (optional)
              - Popover alignment
            </li>
            <li>
              <code className="text-neutral-12">locale</code>: string (optional) - Locale for date
              formatting
            </li>
            <li>
              <code className="text-neutral-12">startDate</code>: Date (optional) - Minimum date for
              range selection
            </li>
            <li>
              <code className="text-neutral-12">validUnits</code>: DurationUnit[] (optional) - Valid
              time units (filters presets)
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Preset Type</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <pre className="text-neutral-12 bg-neutral-3 overflow-x-auto rounded-sm p-3 text-xs">
            {`type Preset = {
  name: string;        // Unique identifier (e.g., "last7d")
  label: string;       // Display label (e.g., "Last 7 days")
  range: {
    from: string;      // Date string (e.g., "now-7d")
    to: string;        // Date string (e.g., "now")
  };
}`}
          </pre>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Date Math Syntax</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              <code className="text-neutral-12">now</code> - Current date/time
            </li>
            <li>
              <code className="text-neutral-12">now-7d</code> - 7 days ago
            </li>
            <li>
              <code className="text-neutral-12">now-1h</code> - 1 hour ago
            </li>
            <li>
              <code className="text-neutral-12">now-15m</code> - 15 minutes ago
            </li>
            <li>
              <code className="text-neutral-12">2026-01-15T00:00:00</code> - Absolute date/time (ISO
              8601)
            </li>
          </ul>
          <p className="text-neutral-10 mt-2 text-xs">
            Valid units:{' '}
            <code className="text-neutral-12">
              m (minutes), h (hours), d (days), w (weeks), M (months), y (years)
            </code>
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Available Presets</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-10 grid grid-cols-3 gap-2 text-xs">
            {availablePresets.map(preset => (
              <li key={preset.name}>
                <code className="text-neutral-12">{preset.label}</code>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Dynamic Preset Generation</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <p className="text-neutral-10 mb-2 text-xs">
            When typing a number in the filter input, the component dynamically generates presets:
          </p>
          <ul className="text-neutral-10 space-y-1 text-xs">
            <li>
              Input: <code className="text-neutral-12">5</code> → Generates: Last 5 minutes, Last 5
              hours, Last 5 days, etc.
            </li>
            <li>
              Input: <code className="text-neutral-12">30</code> → Generates: Last 30 minutes, Last
              30 hours, Last 30 days, etc.
            </li>
            <li>Filters out duplicates of existing static presets</li>
            <li>Only shows units specified in validUnits prop</li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Calendar Overlay</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-10 space-y-2 text-xs">
            <li>
              Positioned: <code className="text-neutral-12">absolute left-0 -translate-x-full</code>{' '}
              (appears to left of popover)
            </li>
            <li>
              Background:{' '}
              <code className="text-neutral-12">bg-neutral-4 rounded-md border p-4</code>
            </li>
            <li>Shows 2 months by default, starts 1 month ago</li>
            <li>Disables future dates and dates before startDate prop</li>
            <li>Selecting a range auto-fills From/To inputs with formatted dates</li>
            <li>
              Close button:{' '}
              <code className="text-neutral-12">absolute right-2 top-1 size-icon-sm</code>
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Validation & Errors</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-10 space-y-2 text-xs">
            <li>
              <strong className="text-neutral-12">Invalid date string:</strong>{' '}
              <span className="text-red-500">Shows error below input</span>
            </li>
            <li>
              <strong className="text-neutral-12">Invalid units:</strong>{' '}
              <span className="text-red-500">
                "Only allowed units are..." error when using disallowed units
              </span>
            </li>
            <li>
              <strong className="text-neutral-12">To before From:</strong>{' '}
              <span className="text-red-500">"To cannot be before from." error</span>
            </li>
            <li>
              <strong className="text-neutral-12">Apply button disabled:</strong> When dates are
              invalid or unchanged
            </li>
          </ul>
        </div>
      </div>

      <div>
        <h2 className="text-neutral-12 mb-4 text-xl font-bold">Implementation Details</h2>
        <div className="bg-neutral-1 border-neutral-6 rounded-sm border p-4">
          <ul className="text-neutral-10 space-y-2 text-xs">
            <li>
              Uses <code className="text-neutral-12">@/lib/date-math</code> for parsing date strings
            </li>
            <li>
              Integrates with <code className="text-neutral-12">Calendar</code> component for visual
              date selection
            </li>
            <li>
              Complex state management with multiple useState hooks for inputs, range, filter, etc.
            </li>
            <li>Modal popover blocks background interaction when open</li>
            <li>Resets to initial state when popover is closed without applying</li>
            <li>Finds matching preset or creates custom preset for absolute ranges</li>
            <li>PresetButton memoized for performance with large preset lists</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
