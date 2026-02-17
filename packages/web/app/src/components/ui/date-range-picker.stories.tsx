import { useState } from 'react';
import type { Story, StoryDefault } from '@ladle/react';
import {
  availablePresets,
  DateRangePicker,
  type DateRangePickerProps,
  type Preset,
  presetLast1Day,
  presetLast7Days,
} from './date-range-picker';

export default {
  title: 'UI / DateRangePicker',
} satisfies StoryDefault;

/** Default with all presets and Last 7 days selected (most common usage) */
export const Default: Story = () => {
  const [selectedRange, setSelectedRange] = useState<Preset['range']>(presetLast7Days.range);

  return (
    <DateRangePicker
      selectedRange={selectedRange}
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};

/** With Last 24 hours selected (used in operation detail views) */
export const Last24Hours: Story = () => {
  const [selectedRange, setSelectedRange] = useState<Preset['range']>(presetLast1Day.range);

  return (
    <DateRangePicker
      selectedRange={selectedRange}
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};

/** With restricted valid units — excludes minutes (used in operation insights) */
export const RestrictedUnits: Story = () => {
  const [selectedRange, setSelectedRange] = useState<Preset['range']>(presetLast7Days.range);

  return (
    <DateRangePicker
      validUnits={['y', 'M', 'w', 'd', 'h']}
      selectedRange={selectedRange}
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};

/** All units enabled with startDate and end-aligned popover (used in manage/admin pages) */
export const AllUnitsWithStartDate: Story = () => {
  const [selectedRange, setSelectedRange] = useState<Preset['range']>(presetLast7Days.range);
  const startDate = new Date();
  startDate.setFullYear(startDate.getFullYear() - 1);

  return (
    <DateRangePicker
      validUnits={['y', 'M', 'w', 'd', 'h', 'm']}
      selectedRange={selectedRange}
      startDate={startDate}
      align="end"
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};

/** With a custom absolute date range selected */
export const AbsoluteDateRange: Story = () => {
  const from = new Date();
  from.setDate(from.getDate() - 3);
  const to = new Date();

  const absoluteRange = {
    from: from.toISOString(),
    to: to.toISOString(),
  };

  const [selectedRange, setSelectedRange] = useState<Preset['range']>(absoluteRange);

  return (
    <DateRangePicker
      selectedRange={selectedRange}
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};

/** With custom presets instead of the defaults */
export const CustomPresets: Story = () => {
  const customPresets: Preset[] = [
    { name: 'last1h', label: 'Last 1 hour', range: { from: 'now-1h', to: 'now' } },
    { name: 'last6h', label: 'Last 6 hours', range: { from: 'now-6h', to: 'now' } },
    presetLast1Day,
    presetLast7Days,
  ];

  const [selectedRange, setSelectedRange] = useState<Preset['range']>(customPresets[0].range);

  return (
    <DateRangePicker
      presets={customPresets}
      selectedRange={selectedRange}
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};

/** With no initial selection */
export const NoSelection: Story = () => {
  const [selectedRange, setSelectedRange] = useState<Preset['range'] | null>(null);

  return (
    <DateRangePicker
      selectedRange={selectedRange}
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};

/** With a startDate that disables older presets */
export const RecentStartDate: Story = () => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const [selectedRange, setSelectedRange] = useState<Preset['range']>(presetLast1Day.range);

  return (
    <DateRangePicker
      selectedRange={selectedRange}
      startDate={startDate}
      onUpdate={args => setSelectedRange(args.preset.range)}
    />
  );
};
