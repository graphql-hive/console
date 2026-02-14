import { cva, type VariantProps } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';

const checkboxVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-3.5',
        md: 'size-4',
      },
      variant: {
        default: [
          'border-neutral-7 dark:border-neutral-7',
          'data-[checked]:bg-accent data-[checked]:border-accent data-[checked]:text-neutral-1',
          'data-[indeterminate]:bg-accent data-[indeterminate]:border-accent data-[indeterminate]:text-neutral-1',
        ],
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  },
);

const iconSizeMap = {
  sm: 'size-2.5',
  md: 'size-3',
} as const;

export function Checkbox({
  size = 'md',
  variant,
  visual,
  ...props
}: Omit<BaseCheckbox.Root.Props, 'children' | 'className'> &
  VariantProps<typeof checkboxVariants> & {
    /** When true, the checkbox is a non-interactive visual indicator (sets pointer-events: none, tabIndex: -1, aria-hidden) */
    visual?: boolean;
  }) {
  const iconClass = iconSizeMap[size ?? 'md'];
  return (
    <BaseCheckbox.Root
      className={checkboxVariants({ size, variant })}
      {...(visual
        ? { tabIndex: -1, 'aria-hidden': true, style: { pointerEvents: 'none' as const } }
        : {})}
      {...props}
    >
      <BaseCheckbox.Indicator className="flex items-center justify-center text-current">
        {props.indeterminate ? (
          <Minus className={iconClass} strokeWidth={3} />
        ) : (
          <Check className={iconClass} strokeWidth={3} />
        )}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
