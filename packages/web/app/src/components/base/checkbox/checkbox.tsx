import { cva, type VariantProps } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';

const checkboxVariants = cva(
  'inline-flex shrink-0 items-center justify-center rounded-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      size: {
        sm: 'size-3.5',
        md: 'size-4.5',
      },
      variant: {
        default: [
          'border-neutral-6',
          'data-[checked]:bg-accent_30 data-[checked]:border-accent_30 data-[checked]:text-accent',
          'hover:bg-neutral-6 hover:border-accent_30',
          'data-[checked]:hover:bg-accent_10',
          'data-[indeterminate]:bg-accent_30 data-[indeterminate]:border-accent_30 data-[indeterminate]:text-accent',
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
    /** When true, the checkbox is a non-interactive visual indicator (preserves hover styles, sets tabIndex: -1, aria-hidden) */
    visual?: boolean;
  }) {
  const iconClass = iconSizeMap[size ?? 'md'];
  return (
    <BaseCheckbox.Root
      className={checkboxVariants({ size, variant })}
      {...(visual
        ? {
            tabIndex: -1,
            'aria-hidden': true,
            style: { cursor: 'default' as const },
            onCheckedChange: undefined,
          }
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
