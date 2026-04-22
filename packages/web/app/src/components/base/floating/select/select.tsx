import { type ReactNode, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Button } from '../../button/button';
import { FloatingSearch } from '../floating-search';
import { floatingEmptyState, floatingScrollArea, itemVariants, floatingVariants, type FloatingProps } from '../shared-styles';

export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type SelectProps = Partial<
  Pick<FloatingProps, 'trigger' | 'side' | 'align' | 'sideOffset' | 'open' | 'onOpenChange'>
> & {
  /** Options to display in the dropdown */
  options: SelectOption[];
  /** Currently selected value */
  value?: string;
  /** Callback when value changes */
  onValueChange?: (value: string) => void;
  /** Placeholder text when no value is selected */
  placeholder?: string;
  /** When true, the select is non-interactive */
  disabled?: boolean;
  /** Show a search input inside the popup for filtering options */
  searchable?: boolean;
};

export function Select({
  options,
  value,
  onValueChange,
  placeholder = 'Select…',
  trigger,
  side = 'bottom',
  align = 'start',
  sideOffset = 4,
  disabled,
  open,
  onOpenChange,
  searchable,
}: SelectProps) {
  const selectedLabel = options.find(o => o.value === value)?.label;
  const [search, setSearch] = useState('');

  const displayedOptions =
    searchable && search
      ? options.filter(
          o => o.value === '' || o.label.toLowerCase().includes(search.toLowerCase()),
        )
      : options;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setSearch('');
    onOpenChange?.(nextOpen);
  };

  return (
    <BaseSelect.Root
      value={value}
      onValueChange={val => {
        if (val != null && onValueChange) {
          onValueChange(val);
        }
      }}
      open={open}
      onOpenChange={handleOpenChange}
      disabled={disabled}
    >
      <BaseSelect.Trigger
        render={
          trigger ??
          ((
            <Button
              label={selectedLabel ?? placeholder}
              rightIcon={{ icon: ChevronDown, withSeparator: true }}
              disabled={disabled}
            />
          ) as React.ReactElement)
        }
      />

      <BaseSelect.Portal>
        <BaseSelect.Positioner
          side={side}
          align={align}
          sideOffset={sideOffset}
          alignItemWithTrigger={false}
          className="outline-none"
        >
          <BaseSelect.Popup className={floatingVariants({ padding: 'sm' })}>
            {searchable && (
              <FloatingSearch label="options" onSearch={setSearch} value={search} />
            )}
            {displayedOptions.length === 0 ? (
              <div className={floatingEmptyState}>No matches</div>
            ) : (
              <div className={searchable ? `${floatingScrollArea} max-h-64` : ''}>
                {displayedOptions.map(option => (
                  <BaseSelect.Item
                    key={option.value}
                    value={option.value}
                    className={state =>
                      itemVariants({
                        highlighted: state.highlighted,
                        selected: state.selected,
                        className: 'relative pl-7',
                      })
                    }
                  >
                    <BaseSelect.ItemIndicator className="absolute left-2 inline-flex items-center">
                      <Check className="size-3" />
                    </BaseSelect.ItemIndicator>
                    <BaseSelect.ItemText>
                      <span className="flex items-center gap-1.5">
                        {option.icon}
                        {option.label}
                      </span>
                    </BaseSelect.ItemText>
                  </BaseSelect.Item>
                ))}
              </div>
            )}
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
