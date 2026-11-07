import { forwardRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { inputStyles } from './input.css';

/** The field itself, shared with Textarea. Fill and border come from the `onSurface` variant. */
export const fieldClass = inputStyles.field;

const inputVariants = lenient(inputStyles.root);

const wrapperVariants = lenient(inputStyles.wrapper);

const prefixVariants = lenient(inputStyles.prefix);

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className' | 'style' | 'size' | 'width' | 'prefix'
>;

type InputVariants = Omit<
  NonNullable<Parameters<typeof inputVariants>[0]>,
  'leadingIcon' | 'trailing' | 'prefixed'
>;

type InputProps = NativeInputProps &
  InputVariants & {
    /** Error state for a field outside a Form; FormControl sets `aria-invalid` itself. */
    invalid?: boolean;
    /** An icon inside the leading edge, for a search field. */
    leadingIcon?: LucideIcon;
    /** Something inside the trailing edge, such as an icon-only button. */
    trailing?: ReactNode;
    /** A fixed block attached to the leading edge, such as the base URL before a slug. */
    prefixText?: string;
    'data-testid'?: string;
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
      className={inputVariants({
        size,
        onSurface,
        width,
        mono,
        leadingIcon: !!LeadingIcon,
        trailing: !!trailing,
        prefixed: !!prefixText,
      })}
      {...native}
    />
  );

  if (!decorated) {
    return input;
  }

  return (
    <span className={wrapperVariants({ fluid: (width ?? 'full') === 'full' })}>
      {prefixText ? (
        <span className={prefixVariants({ size, onSurface })}>{prefixText}</span>
      ) : null}
      {LeadingIcon ? <LeadingIcon className={inputStyles.leadingIcon} /> : null}
      {input}
      {trailing ? <span className={inputStyles.trailing}>{trailing}</span> : null}
    </span>
  );
});
