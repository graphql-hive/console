import { X } from 'lucide-react';
import { segmentButton, segmentSeparator } from '@/components/ui/primitives/shared-styles';
import { formatCount } from '@/lib/utils';
import { Menu } from '../../primitives/floating/menu/menu';
import { chipClass, chipRemoveButtonClass } from './filter-dropdown';
import { TextListPanel, type TextListPanelProps } from './text-list-panel';

export type TextListFilterChipProps = TextListPanelProps & {
  /** Singular noun for the count, e.g. "id" for "3 ids". */
  countNoun?: string;
  /** Called when the chip's X is clicked. */
  onRemove: () => void;
};

/** A `Label | 3 ids | X` pill whose middle segment reopens the list. */
export function TextListFilterChip({
  countNoun = 'value',
  onRemove,
  ...panel
}: TextListFilterChipProps) {
  return (
    <div role="group" aria-label={`${panel.label} filter`} className={chipClass}>
      <span className="px-2.5 py-1.5 text-control">{panel.label}</span>

      <span className={segmentSeparator}>
        <Menu
          trigger={
            <button type="button" className={segmentButton}>
              {formatCount(panel.values.length, countNoun)}
            </button>
          }
          modal={false}
          side="bottom"
          align="start"
          content={<TextListPanel {...panel} />}
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
