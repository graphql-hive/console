import { type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Select as BaseSelect } from '@base-ui/react/select';
import { itemVariants, popupVariants, type FloatingProps } from '../shared-styles';
import { TriggerButton } from '../trigger-button';

export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
};

type SelectProps = Partial<Pick<FloatingProps, 'trigger' | 'side' | 'align' | 'sideOffset'>> & {
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
}: SelectProps) {
  return (
    <BaseSelect.Root
      value={value}
      onValueChange={val => {
        if (val != null && onValueChange) {
          onValueChange(val);
        }
      }}
      disabled={disabled}
    >
      <BaseSelect.Trigger
        render={
          trigger ?? (
            <TriggerButton
              label={<BaseSelect.Value placeholder={placeholder} />}
              rightIcon={{ icon: ChevronDown, withSeparator: true }}
              disabled={disabled}
            />
          )
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
                  })
                }
              >
                <BaseSelect.ItemIndicator>
                  <Check className="size-3.5" />
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
