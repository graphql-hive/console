import { forwardRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { cn } from '@/lib/utils';
import { controlSize, type ControlSize, type OnSurface } from '../shared-styles';
import * as styles from './input.css';

/** The field itself, shared with Textarea. Fill and border come from the `onSurface` variant. */
export const fieldClass = styles.field;

// The block before a slug sits one step further from the page than the field it joins.
const prefixSurface = {
  base: styles.prefixSurfaceBase,
  raised: styles.prefixSurfaceRaised,
} as const satisfies Record<OnSurface, string>;

const inputVariants = lenient(styles.inputVariants);

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className' | 'style' | 'size' | 'width' | 'prefix'
>;

type InputProps = NativeInputProps &
  NonNullable<Parameters<typeof inputVariants>[0]> & {
    /** Error state for a field outside a Form; FormControl sets `aria-invalid` itself. */
    invalid?: boolean;
    /** An icon inside the leading edge, for a search field. */
    leadingIcon?: LucideIcon;
    /** Something inside the trailing edge, such as an icon-only button. */
    trailing?: ReactNode;
    /** A fixed block attached to the leading edge, such as the base URL before a slug. */
    prefixText?: string;
    'data-cy'?: string;
  };

/** forwardRef is required: react-hook-form's Controller passes a ref to manage focus and validation. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size,
    onSurface,
    width,
    mono,
    invalid,
    leadingIcon: LeadingIcon,
    trailing,
    prefixText,
    'aria-invalid': ariaInvalid,
    ...props
  },
  ref,
) {
  // className is not a prop, but a spread from a form library can still carry one in; on the
  // element it would replace every class above, so it is dropped here rather than typed out.
  const { className: _injected, ...native } = props as typeof props & { className?: string };
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === 'true';
  const decorated = !!(LeadingIcon || trailing || prefixText);

  const input = (
    <input
      ref={ref}
      aria-invalid={isInvalid || undefined}
      className={cn(
        inputVariants({ size, onSurface, width, mono }),
        LeadingIcon && styles.inputInput,
        trailing && styles.inputInput2,
        prefixText && styles.inputInput3,
      )}
      {...native}
    />
  );

  if (!decorated) {
    return input;
  }

  // The width stays on the field: a fixed field keeps its size and a prefix adds its own, so a
  // long slug prefix cannot squeeze the field. A fluid field needs the wrapper to be fluid too.
  return (
    <span className={cn(styles.inputSpan, (width ?? 'full') === 'full' && styles.inputSpan2)}>
      {prefixText ? (
        <span
          className={cn(
            controlSize[(size ?? 'default') as ControlSize],
            prefixSurface[onSurface ?? 'base'],
            styles.inputSpan3,
          )}
        >
          {prefixText}
        </span>
      ) : null}
      {LeadingIcon ? <LeadingIcon className={styles.inputLeadingIcon} /> : null}
      {input}
      {trailing ? <span className={styles.inputSpan4}>{trailing}</span> : null}
    </span>
  );
});
