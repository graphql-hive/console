import { cva, type VariantProps } from 'class-variance-authority';
import { Check, Minus } from 'lucide-react';
import { Checkbox as BaseCheckbox } from '@base-ui/react/checkbox';
import { focusRing } from '../shared-styles';

const checkboxVariants = cva(
  [
    'inline-flex shrink-0 items-center justify-center rounded-sm border transition-colors data-[disabled]:cursor-not-allowed data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
    focusRing,
  ],
  {
    variants: {
      size: {
        sm: 'size-3.5',
        md: 'size-4.5',
      },
      variant: {
        default: [
          'border-line-strong',
          'data-[checked]:bg-accent-tint-strong data-[checked]:border-accent-line data-[checked]:text-accent',
          'not-[[data-disabled]]:hover:bg-neutral-6 not-[[data-disabled]]:hover:border-accent-line',
          'not-[[data-disabled]]:data-[checked]:hover:bg-accent-tint',
          'data-[indeterminate]:bg-accent-tint-strong data-[indeterminate]:border-accent-line data-[indeterminate]:text-accent',
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
