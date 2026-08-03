import { forwardRef } from 'react';

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>;

/**
 * forwardRef is required here because react-hook-form's Controller
 * passes a ref to manage focus and validation.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  return (
    <input
      ref={ref}
      className={[
        'text-neutral-12 placeholder:text-neutral-8 bg-neutral-2 border-neutral-5 dark:bg-neutral-3 dark:border-neutral-4',
        'rounded-sm border px-3 py-1.5 text-[13px] transition-colors',
        'hover:border-neutral-6 focus:border-neutral-7 focus:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-50',
      ].join(' ')}
      {...props}
    />
  );
});
