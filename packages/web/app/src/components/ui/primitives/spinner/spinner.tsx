import { LoaderCircle } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import * as shared from '@/styles/shared.css';
import * as styles from './spinner.css';

const spinnerVariants = lenient(styles.spinnerVariants);

type SpinnerProps = {
  /** What assistive tech announces; the icon itself is decorative. */
  label?: string;
  variants?: NonNullable<Parameters<typeof spinnerVariants>[0]>;
};

/**
 * Placement is the parent's job. The wrapper is inline so `text-center` on a table cell and
 * `items-center` on a flex row both position it. The label is also sr-only text: live regions announce content, not labels.
 */
export function Spinner({ label = 'Loading', variants }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={shared.inlineFlex}>
      <LoaderCircle aria-hidden className={spinnerVariants({ ...variants })} />
      <span className={shared.srOnly}>{label}</span>
    </span>
  );
}
