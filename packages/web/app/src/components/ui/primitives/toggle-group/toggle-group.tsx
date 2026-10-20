import { type ReactNode } from 'react';
import { lenient } from '@/lib/recipe';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Tooltip } from '../floating/tooltip/tooltip';
import * as styles from './toggle-group.css';

const groupVariants = lenient(styles.groupVariants);

const itemVariants = lenient(styles.itemVariants);

export type ToggleGroupOption = {
  value: string;
  /** Text, or an icon for an icon-only item (give those a `tooltip` so they have a name). */
  label: ReactNode;
  tooltip?: string;
  disabled?: boolean;
};

type ToggleGroupProps = NonNullable<Parameters<typeof groupVariants>[0]> & {
  options: ToggleGroupOption[];
  /** `undefined` presses nothing, for a setting that has not been chosen yet. */
  value: string | undefined;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  'aria-label'?: string;
};

/**
 * A single-select segmented control. Once an option is pressed the group cannot be cleared:
 * pressing the current option again is ignored, because every call site holds a setting that
 * has no "unset" state once chosen.
 */
export function ToggleGroup({
  options,
  value,
  onValueChange,
  disabled,
  size,
  onSurface,
  'aria-label': ariaLabel,
}: ToggleGroupProps) {
  return (
    <BaseToggleGroup
      value={value === undefined ? [] : [value]}
      onValueChange={groupValue => {
        const next = groupValue[0] as string | undefined;
        if (next !== undefined && next !== value) {
          onValueChange(next);
        }
      }}
      disabled={disabled}
      aria-label={ariaLabel}
      className={groupVariants({ size, onSurface })}
    >
      {options.map(option => {
        const item = (
          <Toggle
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-label={typeof option.label === 'string' ? undefined : option.tooltip}
            className={itemVariants({ size })}
          >
            {option.label}
          </Toggle>
        );
        return option.tooltip ? (
          <Tooltip key={option.value} trigger={item} content={option.tooltip} />
        ) : (
          item
        );
      })}
    </BaseToggleGroup>
  );
}
