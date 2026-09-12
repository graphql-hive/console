import { cva, type VariantProps } from 'class-variance-authority';
import { Switch as BaseSwitch } from '@base-ui/react/switch';

const switchRootVariants = cva(
  [
    'group relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors',
    'data-[unchecked]:bg-neutral-6 data-[checked]:bg-success',
    'not-data-[disabled]:data-[unchecked]:hover:bg-neutral-8',
    'not-data-[disabled]:data-[checked]:hover:bg-success_80',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
    'focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-2',
    // Base UI renders a span, so `:disabled` never matches; the state is a data attribute.
    'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
  ],
  {
    variants: {
      size: {
        standard: 'h-5 w-10 p-0.5 ',
        small: 'h-2.5 w-6',
      },
      decorative: {
        true: 'cursor-[inherit]',
      },
    },
    defaultVariants: {
      size: 'standard',
    },
  },
);

const switchThumbVariants = cva(
  [
    'pointer-events-none block rounded-full transition-transform',
    'bg-neutral-1 dark:bg-neutral-12 data-[unchecked]:bg-neutral-4 data-[unchecked]:dark:bg-neutral-10',
    // A 1px dark ring plus a short drop shadow. The checked track is a bright green in dark mode,
    // so a light thumb needs an edge of its own; the default shadow-sm is too faint to give one.
    'shadow-[0_1px_3px_rgba(0,0,0,0.5),0_0_0_1px_rgba(0,0,0,0.25)]',
  ],
  {
    variants: {
      size: {
        standard: 'size-4 data-[checked]:translate-x-5',
        small: 'size-[13px] data-[checked]:translate-x-[11px]',
      },
    },
    defaultVariants: {
      size: 'standard',
    },
  },
);

type SwitchProps = VariantProps<typeof switchRootVariants> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  /** So a `<label htmlFor>` can point at it. */
  id?: string;
  /** For a switch with no visible label, such as one in a table row. */
  'aria-label'?: string;
  'data-cy'?: string;
  /**
   * Draws the switch as a read-out of state rather than as a control: not focusable, hidden from
   * assistive tech, and taking the cursor of whatever owns the click. Example: a switch inside a
   * menu row or a clickable card, where the row is the interactive thing and the switch only shows
   * whether it is on.
   */
  decorative?: boolean;
};

export function Switch({
  size,
  decorative,
  checked,
  defaultChecked,
  onCheckedChange,
  disabled,
  id,
  'aria-label': ariaLabel,
  'data-cy': dataCy,
}: SwitchProps) {
  return (
    <BaseSwitch.Root
      className={switchRootVariants({ size, decorative })}
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      id={id}
      aria-label={ariaLabel}
      aria-hidden={decorative || undefined}
      tabIndex={decorative ? -1 : undefined}
      data-cy={dataCy}
      // A toggle's click never means "also activate whatever I am sitting in", so it is stopped
      // here rather than at each call site that puts a switch inside a clickable row.
      onClick={event => event.stopPropagation()}
    >
      <BaseSwitch.Thumb className={switchThumbVariants({ size })} />
    </BaseSwitch.Root>
  );
}
