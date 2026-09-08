import { X } from 'lucide-react';
import { segmentButton, segmentSeparator } from '@/components/base/shared-styles';
import { FloatingSearch } from '../floating-search';
import { Menu } from '../menu/menu';
import { chipClass, chipRemoveButtonClass } from './filter-dropdown';

export type TextFilterChipProps = {
  /** Singular label shown on the leading segment. */
  label: string;
  /** Current value. Rendered as the chip's middle segment. */
  value: string;
  onChange: (next: string) => void;
  /** Called when the chip's X is clicked. */
  onRemove: () => void;
  placeholder?: string;
};

/**
 * The free-text counterpart to `FilterDropdown`: a `Label | value | X` pill
 * whose middle segment opens an input to edit the value in place.
 */
export function TextFilterChip({
  label,
  value,
  onChange,
  onRemove,
  placeholder,
}: TextFilterChipProps) {
  return (
    <div role="group" aria-label={`${label} filter`} className={chipClass}>
      <span className="px-2.5 py-1.5 text-[13px]">{label}</span>

      <span className={segmentSeparator}>
        <Menu
          trigger={
            <button type="button" className={`${segmentButton} max-w-40 truncate`} title={value}>
              {value}
            </button>
          }
          modal={false}
          side="bottom"
          align="start"
          maxWidth="lg"
          stableWidth
          sections={[
            <FloatingSearch
              key="input"
              label={label}
              value={value}
              onSearch={onChange}
              placeholder={placeholder}
              standalone
            />,
          ]}
        />
      </span>

      <button
        type="button"
        className={`${segmentSeparator} ${chipRemoveButtonClass}`}
        aria-label={`Remove ${label} filter`}
        onClick={onRemove}
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
