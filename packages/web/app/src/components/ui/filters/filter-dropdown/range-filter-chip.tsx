import { X } from 'lucide-react';
import { segmentButton, segmentSeparator } from '@/components/ui/primitives/shared-styles';
import { Menu } from '../../primitives/floating/menu/menu';
import type { RangeValue } from '../filter-menu/types';
import { chipClass, chipRemoveButtonClass } from './filter-dropdown';
import { RangeFilterPanel, type RangeFilterPanelProps } from './range-filter-panel';

export type RangeFilterChipProps = RangeFilterPanelProps & {
  /** Called when the chip's X is clicked. */
  onRemove: () => void;
};

/** "100–500 ms", "≥ 100 ms" or "≤ 500 ms". Empty when both ends are unbounded. */
export function formatRange(value: RangeValue, unit?: string): string {
  const n = (v: number) => v.toLocaleString('en-US');
  const suffix = unit ? ` ${unit}` : '';
  if (value.min !== null && value.max !== null) {
    return `${n(value.min)}–${n(value.max)}${suffix}`;
  }
  if (value.min !== null) {
    return `≥ ${n(value.min)}${suffix}`;
  }
  if (value.max !== null) {
    return `≤ ${n(value.max)}${suffix}`;
  }
  return '';
}

/** A `Label | range | X` pill whose middle segment reopens the range panel. */
export function RangeFilterChip({ onRemove, ...panel }: RangeFilterChipProps) {
  const text = formatRange(panel.value, panel.unit);
  return (
    <div role="group" aria-label={`${panel.label} filter`} className={chipClass}>
      <span className="px-2.5 py-1.5 text-control">{panel.label}</span>

      <span className={segmentSeparator}>
        <Menu
          trigger={
            <button type="button" className={segmentButton}>
              {text}
            </button>
          }
          modal={false}
          side="bottom"
          align="start"
          content={<RangeFilterPanel {...panel} />}
        />
      </span>

      <button
        type="button"
        className={`${segmentSeparator} ${chipRemoveButtonClass}`}
        aria-label={`Remove ${panel.label} filter`}
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
