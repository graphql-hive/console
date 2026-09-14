import { useState } from 'react';
import { createPreview, type NavPath } from 'react-foundry';
import { Input as BaseInput } from '@/components/base/input/input';
import { CallSite, InventoryList } from '@/components/inventory/shared';
import { formatMillionOrBillion } from '@/components/organization/billing/helpers';
import { Input } from '@/components/v2/input';
import { Slider } from './slider';

export const nav: NavPath = 'Base/FormControls/Slider/Component Examples';

/**
 * Both sliders in the app, transcribed with their real surroundings. Neither page can be imported:
 * the subscription page needs Stripe and a billing query, the traces filter a URL-state filter.
 *
 * History: the subscription picker was `v2/slider` (a Radix wrapper with an array value and every
 * part painted neutral-12, so the filled range never showed); the duration filter was its own
 * two-thumb `DoubleSlider` built straight on `@radix-ui/react-slider`. Both moved to base in
 * round 4, which is when the range mode was added.
 */

const ENTRIES = [
  {
    source: 'pages/organization-subscription-manage.tsx:469',
    origin: 'base',
    what: 'Operations rate-limit picker on the Pro plan, with a text input showing the same number',
    coveredBy: 'Subscription rate limit',
  },
  {
    source: 'pages/traces/target-traces-filter.tsx:423',
    origin: 'base',
    what: 'Duration range under the MIN / MAX inputs of the traces filter column',
    coveredBy: 'Duration filter',
  },
] as const;

export const Inventory = createPreview({
  label: 'Inventory',
  render: () => (
    <InventoryList
      component="base/slider"
      summary={
        <>
          One single-value slider and one range. Both pair the slider with a text input that shows
          and edits the same number, so the two stay in sync in each direction.
        </>
      }
      entries={ENTRIES}
    />
  ),
});

/** SubscriptionSlider, minus the parsing of typed values back into millions. */
function SubscriptionRateLimit() {
  const min = 1;
  const max = 1500;
  const [operationsRateLimit, setOperationsRateLimit] = useState(12);
  const [inputValue, setInputValue] = useState(formatMillionOrBillion(operationsRateLimit));
  return (
    <div className="space-y-2">
      <Slider
        min={min}
        max={max}
        step={1}
        value={Math.min(operationsRateLimit, max)}
        onValueChange={next => {
          setOperationsRateLimit(next);
          setInputValue(formatMillionOrBillion(next));
        }}
        aria-label="Operations per month, in millions"
      />

      <span>{formatMillionOrBillion(operationsRateLimit)}</span>
      <div className="flex justify-between">
        <span>1M</span>
        <span>500M</span>
        <span>1B</span>
        <span>Custom</span>
      </div>

      <div className="ml-auto w-48">
        <Input
          value={inputValue}
          className="ml-auto text-end"
          onChange={event => setInputValue(event.target.value)}
        />
      </div>
    </div>
  );
}

export const SubscriptionRateLimitPreview = createPreview({
  label: 'Subscription rate limit',
  render: () => (
    <CallSite
      source="pages/organization-subscription-manage.tsx:469"
      origin="base"
      note="Under 'Define your reserved volume' on the Pro plan. The slider is capped at 1500M; typing a larger number into the input keeps the value but pins the thumb at the end."
    >
      <div className="w-[28rem]">
        <SubscriptionRateLimit />
      </div>
    </CallSite>
  ),
});

/** DurationFilter's content, without the debounced URL-state write. */
function DurationFilter() {
  const minValue = 0;
  const maxValue = 100_000;
  const [values, setValues] = useState<[number, number]>([minValue, maxValue]);
  return (
    <div className="space-y-6 p-2">
      <div className="space-y-2">
        <div className="space-y-1">
          <label className="font-mono text-xs text-zinc-400">MIN</label>
          <BaseInput
            type="number"
            value={values[0]}
            onChange={e => setValues([Number.parseInt(e.target.value) || minValue, values[1]])}
            size="compact"
            mono
            trailing={<span className="text-neutral-10 font-mono text-xs">ms</span>}
          />
        </div>
        <div className="space-y-1">
          <label className="font-mono text-xs text-zinc-400">MAX</label>
          <BaseInput
            type="number"
            value={values[1]}
            onChange={e => setValues([values[0], Number.parseInt(e.target.value) || minValue])}
            size="compact"
            mono
            trailing={<span className="text-neutral-10 font-mono text-xs">ms</span>}
          />
        </div>
      </div>
      <Slider
        max={maxValue}
        min={minValue}
        step={1}
        value={values}
        onValueChange={setValues}
        aria-label="Duration"
      />
    </div>
  );
}

export const DurationFilterPreview = createPreview({
  label: 'Duration filter',
  render: () => (
    <CallSite
      source="pages/traces/target-traces-filter.tsx:423"
      origin="base"
      note="The Duration group of the traces filter column. The inputs and thumbs edit the same pair. The fields are compact mono base Inputs with the unit in the trailing slot; before round 5 they were a hand-rolled input with a zinc border on MIN and neutral-5 on MAX."
    >
      <div className="w-56">
        <DurationFilter />
      </div>
    </CallSite>
  ),
});
