import { ComponentProps, forwardRef } from 'react';
import { clsx } from 'clsx';

const Button = forwardRef<HTMLButtonElement, ComponentProps<'button'>>(
  ({ children, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        {...props}
        className={clsx(
          'inline-flex select-none items-center justify-center rounded-md px-4 py-2 text-sm font-medium',
          'bg-white text-gray-700',
          'focus-within:ring',
          // Register all radix states
          'group',
          className,
        )}
      >
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';

export const RadixButton = Button;
