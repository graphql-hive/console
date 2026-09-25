import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Toggle } from '@base-ui/react/toggle';
import { ToggleGroup as BaseToggleGroup } from '@base-ui/react/toggle-group';
import { Tooltip } from '../floating/tooltip/tooltip';
import { controlSize, controlSurface, focusRing } from '../shared-styles';

const groupVariants = cva('inline-flex rounded-sm border', {
  variants: {
    size: controlSize,
    onSurface: controlSurface,
  },
  defaultVariants: {
    size: 'compact',
    onSurface: 'base',
  },
});

const itemVariants = cva(
  [
    'relative flex cursor-pointer items-center justify-center self-stretch font-medium transition-colors',
    'text-fg-muted dark:text-fg-default hover:bg-neutral-4/50 hover:text-fg',
    'data-[pressed]:bg-neutral-3 dark:data-[pressed]:bg-neutral-5 data-[pressed]:text-fg',
    'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    // The group draws the outer border; items only separate themselves from the one before.
    'first:rounded-l-[inherit] last:rounded-r-[inherit] not-first:border-l not-first:[border-left-color:inherit]',
    // A later sibling's fill would otherwise paint over the outline where it overlaps.
    'focus-visible:z-10',
    focusRing,
  ],
  {
    variants: {
      size: {
        compact: 'px-3',
        default: 'px-4',
      },
    },
    defaultVariants: {
      size: 'compact',
    },
  },
);

export type ToggleGroupOption = {
  value: string;
  /** Text, or an icon for an icon-only item (give those a `tooltip` so they have a name). */
  label: ReactNode;
  tooltip?: string;
  disabled?: boolean;
};

type ToggleGroupProps = VariantProps<typeof groupVariants> & {
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
