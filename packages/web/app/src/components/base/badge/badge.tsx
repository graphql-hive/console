import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 cursor-default items-center justify-center overflow-hidden whitespace-nowrap rounded-md border font-medium',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-6 text-fg-default',
        secondary: 'border-transparent bg-neutral-4 text-fg-default',
        outline: 'border-line font-normal text-fg-default',
        // The semantic states, tinted: a 10% fill of the token under its full-strength text, so
        // a pill never needs its own red or green.
        success: 'border-transparent bg-success-tint text-success',
        warning: 'border-transparent bg-warning-tint text-warning',
        critical: 'border-transparent bg-critical-tint text-critical',
        info: 'border-transparent bg-info-tint text-info',
      },
      size: {
        default: 'px-2 py-0.5 text-xs',
        /** For a count beside a tab label or a filter row. */
        sm: 'text-2xs px-1.5 py-px',
      },
      /** For an identifier such as a permission key, rather than a word. */
      mono: {
        true: 'font-mono',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      mono: false,
    },
  },
);

type BadgeProps = {
  content: string;
  variants?: VariantProps<typeof badgeVariants>;
};

export function Badge({ content, variants }: BadgeProps) {
  return <span className={badgeVariants({ ...variants })}>{content}</span>;
}
