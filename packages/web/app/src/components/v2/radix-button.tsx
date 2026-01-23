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
          'bg-gray-800 text-gray-100 hover:bg-gray-900',
          'focus-within:ring',
          // Register all radix states
          'group',
          'data-[state=open]:bg-gray-900',
          'data-[state=on]:bg-gray-900',
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
