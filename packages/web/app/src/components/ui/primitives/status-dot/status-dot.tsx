import { cva, type VariantProps } from 'class-variance-authority';

const statusDotVariants = cva('inline-block shrink-0 rounded-full', {
  variants: {
    color: {
      success: 'bg-success',
      warning: 'bg-warning',
      critical: 'bg-critical',
      info: 'bg-info',
      neutral: 'bg-neutral-9',
    },
    size: {
      default: 'size-2',
    },
  },
  defaultVariants: {
    color: 'neutral',
    size: 'default',
  },
});

type StatusDotProps = VariantProps<typeof statusDotVariants> & {
  /**
   * What the colour means, for assistive tech. Leave it out when the text beside the dot already
   * says so, and the dot is decoration.
   */
  label?: string;
};

/** A coloured dot standing for a state: a check passed, a version is invalid, an alert is critical. */
export function StatusDot({ color, size, label }: StatusDotProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={statusDotVariants({ color, size })}
    />
  );
}
