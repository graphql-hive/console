import { forwardRef, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { controlSize, focusRing, type ControlSize } from '../shared-styles';

/** The field itself, shared with Textarea. */
export const fieldClass = [
  'text-neutral-12 placeholder:text-neutral-8 bg-neutral-2 border-neutral-5 dark:bg-neutral-3 dark:border-neutral-4',
  'min-w-0 rounded-sm border transition-colors',
  'hover:border-neutral-6 focus:border-neutral-7 focus:outline-none',
  focusRing,
  'disabled:cursor-not-allowed disabled:opacity-50',
  // Error state comes from the attribute, so a react-hook-form FormControl and a Formik `invalid`
  // prop paint the same border.
  'aria-invalid:border-critical aria-invalid:hover:border-critical aria-invalid:focus:border-critical',
];

export const fieldWidth = {
  full: 'w-full',
  xs: 'w-16',
  sm: 'w-48',
  md: 'w-96',
} as const;

const inputVariants = cva(fieldClass, {
  variants: {
    size: {
      compact: `${controlSize.compact} px-2.5 text-sm`,
      default: `${controlSize.default} px-3 text-sm`,
    },
    width: fieldWidth,
    mono: {
      true: 'font-mono',
      false: '',
    },
  },
  defaultVariants: {
    size: 'default',
    width: 'full',
    mono: false,
  },
});

type NativeInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'className' | 'style' | 'size' | 'width' | 'prefix'
>;

type InputProps = NativeInputProps &
  VariantProps<typeof inputVariants> & {
    /** Error state, for forms that track it by hand (Formik). react-hook-form sets `aria-invalid` itself. */
    invalid?: boolean;
    /** An icon inside the leading edge, for a search field. */
    leadingIcon?: LucideIcon;
    /** Something inside the trailing edge, such as an icon-only button. */
    trailing?: ReactNode;
    /** A fixed block attached to the leading edge, such as the base URL before a slug. */
    prefixText?: string;
    'data-cy'?: string;
  };

/**
 * forwardRef is required: react-hook-form's Controller passes a ref to manage focus and
 * validation, and a Formik field may need it for the same reasons.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    size,
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
  // A react-hook-form FormControl is a Radix Slot: it merges a className into whatever it wraps,
  // an empty one when the field is valid. Spread onto the input it would replace every class
  // above, so it is dropped here rather than typed out.
  const { className: _injected, ...native } = props as typeof props & { className?: string };
  const isInvalid = invalid || ariaInvalid === true || ariaInvalid === 'true';
  const decorated = !!(LeadingIcon || trailing || prefixText);

  const input = (
    <input
      ref={ref}
      aria-invalid={isInvalid || undefined}
      className={cn(
        inputVariants({ size, width: decorated ? 'full' : width, mono }),
        LeadingIcon && 'pl-9',
        trailing && 'pr-9',
        prefixText && 'rounded-l-none',
      )}
      {...native}
    />
  );

  if (!decorated) {
    return input;
  }

  return (
    <span className={cn('relative inline-flex items-center', fieldWidth[width ?? 'full'])}>
      {prefixText ? (
        <span
          className={cn(
            'border-neutral-5 bg-neutral-3 text-neutral-10 dark:bg-neutral-4 dark:border-neutral-4 inline-flex shrink-0 items-center whitespace-nowrap rounded-l-sm border border-r-0 px-3',
            controlSize[(size ?? 'default') as ControlSize],
          )}
        >
          {prefixText}
        </span>
      ) : null}
      {LeadingIcon ? (
        <LeadingIcon className="text-neutral-9 pointer-events-none absolute left-3 size-4" />
      ) : null}
      {input}
      {trailing ? (
        <span className="absolute right-1.5 inline-flex items-center">{trailing}</span>
      ) : null}
    </span>
  );
});
