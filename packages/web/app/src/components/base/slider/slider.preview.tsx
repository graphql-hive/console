import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Slider } from './slider';

export const nav: NavPath = 'Base/FormControls/Slider';

/**
 * One thumb, one value. The filled range is accent so the position reads at a glance; the old
 * v2 slider painted track, range and thumb all neutral-12, so the range was invisible.
 */
export const Controlled = createPreview(() => {
  const [value, setValue] = useState(12);
  return (
    <div className="flex w-[28rem] flex-col gap-2">
      <Slider min={1} max={300} value={value} onValueChange={setValue} aria-label="Operations" />
      <span className="text-neutral-11 text-sm">{value}M operations per month</span>
    </div>
  );
});

/** Snaps to the nearest step; arrow keys move one step, Page Up/Down ten. */
export const Stepped = createPreview(() => {
  const [value, setValue] = useState(50);
  return (
    <div className="flex w-[28rem] flex-col gap-2">
      <Slider
        min={0}
        max={100}
        step={25}
        value={value}
        onValueChange={setValue}
        aria-label="Share"
      />
      <span className="text-neutral-11 text-sm">{value}%</span>
    </div>
  );
});

/** A two-element value gives two thumbs, for a bounded range such as the traces duration filter. */
export const Range = createPreview(() => {
  const [range, setRange] = useState<[number, number]>([2000, 60_000]);
  return (
    <div className="flex w-[28rem] flex-col gap-2">
      <Slider min={0} max={100_000} value={range} onValueChange={setRange} aria-label="Duration" />
      <span className="text-neutral-11 font-mono text-xs">
        {range[0]} ms to {range[1]} ms
      </span>
    </div>
  );
});

export const Disabled = createPreview(() => (
  <div className="w-[28rem]">
    <Slider
      min={1}
      max={300}
      value={120}
      onValueChange={() => {}}
      disabled
      aria-label="Operations"
    />
  </div>
));

/** At the ends of the range the thumb stays inside the track rather than overhanging it. */
export const Extremes = createPreview(() => (
  <div className="flex w-[28rem] flex-col gap-4">
    <Slider min={0} max={10} value={0} onValueChange={() => {}} aria-label="Minimum" />
    <Slider min={0} max={10} value={10} onValueChange={() => {}} aria-label="Maximum" />
  </div>
));
