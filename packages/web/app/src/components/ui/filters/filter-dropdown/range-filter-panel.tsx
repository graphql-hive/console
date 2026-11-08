import { useId, useState } from 'react';
import { Input } from '../../primitives/input/input';
import { Label } from '../../primitives/label/label';
import { Slider } from '../../primitives/slider/slider';
import type { RangeValue } from '../filter-menu/types';

type Bounds = { min: number; max: number };

export type RangeFilterPanelProps = {
  /** Names the slider; its thumbs read "{label} minimum" and "{label} maximum". */
  label: string;
  bounds: Bounds;
  step?: number;
  unit?: string;
  value: RangeValue;
  onChange: (next: RangeValue) => void;
};

/** Clamps to the bounds, puts the ends in order, and turns an end at its bound into `null`. */
export function normalizeRange(min: number, max: number, bounds: Bounds): RangeValue {
  const clamp = (n: number) => Math.min(Math.max(n, bounds.min), bounds.max);
  const [low, high] = [clamp(min), clamp(max)].sort((a, b) => a - b);
  return {
    min: low <= bounds.min ? null : low,
    max: high >= bounds.max ? null : high,
  };
}

function toPair(value: RangeValue, bounds: Bounds): [number, number] {
  return [value.min ?? bounds.min, value.max ?? bounds.max];
}

const sameRange = (a: RangeValue, b: RangeValue) => a.min === b.min && a.max === b.max;

/**
 * Min/Max inputs over a two-thumb slider. Edits stay local until confirmed (slider release, input
 * blur or Enter), so a URL-backed `onChange` runs once per edit rather than per drag tick.
 */
export function RangeFilterPanel({
  label,
  bounds,
  step = 1,
  unit,
  value,
  onChange,
}: RangeFilterPanelProps) {
  const id = useId();
  // The draft remembers the value it started from, so a new value from outside replaces it.
  const [draft, setDraft] = useState<{ from: RangeValue; pair: [number, number] } | null>(null);
  const pair = draft && sameRange(draft.from, value) ? draft.pair : toPair(value, bounds);

  const commit = (min: number, max: number) => {
    const next = normalizeRange(min, max, bounds);
    if (sameRange(next, value)) {
      setDraft(null);
      return;
    }
    setDraft({ from: value, pair: toPair(next, bounds) });
    onChange(next);
  };

  return (
    <div className="flex w-64 flex-col gap-4 p-3">
      <div className="grid grid-cols-2 gap-2">
        <BoundInput
          id={`${id}-min`}
          label="Min"
          value={pair[0] <= bounds.min ? null : pair[0]}
          unit={unit}
          onCommit={n => commit(n ?? bounds.min, pair[1])}
        />
        <BoundInput
          id={`${id}-max`}
          label="Max"
          value={pair[1] >= bounds.max ? null : pair[1]}
          unit={unit}
          onCommit={n => commit(pair[0], n ?? bounds.max)}
        />
      </div>
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={step}
        value={pair}
        onValueChange={next => setDraft({ from: value, pair: next })}
        onValueCommitted={([min, max]) => commit(min, max)}
        aria-label={label}
      />
    </div>
  );
}

/** Empty means unbounded. The typed text is kept only while focused, then shows the settled value. */
function BoundInput(props: {
  id: string;
  label: string;
  value: number | null;
  unit?: string;
  onCommit: (next: number | null) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const shown = props.value === null ? '' : String(props.value);

  const commit = () => {
    if (text === null) {
      return;
    }
    setText(null);
    const trimmed = text.trim();
    const parsed = Number(trimmed);
    if (trimmed === '') {
      props.onCommit(null);
    } else if (Number.isFinite(parsed)) {
      props.onCommit(parsed);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor={props.id} label={props.label} />
      <Input
        id={props.id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="Any"
        value={text ?? shown}
        onChange={e => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={e => {
          // Escape still reaches the menu to close it; everything else stays out of its typeahead.
          if (e.key !== 'Escape') {
            e.stopPropagation();
          }
          if (e.key === 'Enter') {
            commit();
          }
        }}
        size="compact"
        mono
        trailing={
          props.unit ? (
            <span className="font-mono text-xs text-fg-secondary">{props.unit}</span>
          ) : undefined
        }
      />
    </div>
  );
}
