import { cva, type VariantProps } from 'class-variance-authority';
import { LoaderCircle } from 'lucide-react';

const spinnerVariants = cva('text-accent shrink-0 animate-spin', {
  variants: {
    size: {
      /** Beside text: a paging bar, a button label. */
      sm: 'size-4',
      default: 'size-6',
      /** A page or panel that has nothing else to show yet. */
      lg: 'size-8',
    },
  },
  defaultVariants: {
    size: 'default',
  },
});

type SpinnerProps = {
  /** What assistive tech announces; the icon itself is decorative. */
  label?: string;
  variants?: VariantProps<typeof spinnerVariants>;
};

/**
 * Placement is the parent's job. The wrapper is inline so `text-center` on a table cell and
 * `items-center` on a flex row both position it; a bare lucide svg is a block under the preflight
 * and would ignore the former.
 */
export function Spinner({ label = 'Loading', variants }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className="inline-flex">
      <LoaderCircle aria-hidden className={spinnerVariants({ ...variants })} />
    </span>
  );
}
