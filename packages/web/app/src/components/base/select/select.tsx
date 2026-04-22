import { type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { Button } from '../button/button';
import { itemVariants, popupVariants, type FloatingProps } from '../shared-styles';

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
}: SelectProps) {
  const selectedLabel = options.find(o => o.value === value)?.label;

  return (
    <BaseSelect.Root
      value={value}
      onValueChange={val => {
        if (val != null && onValueChange) {
          onValueChange(val);
        }
      }}
      open={open}
      onOpenChange={onOpenChange}
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
          <BaseSelect.Popup className={popupVariants({ padding: 'sm' })}>
            {options.map(option => (
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
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
