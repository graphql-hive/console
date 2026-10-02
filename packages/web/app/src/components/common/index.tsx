import { ComponentProps, ReactElement } from 'react';
import { cn } from '@/lib/utils';

export function Label({ className, children, ...props }: ComponentProps<'span'>): ReactElement {
  return (
    <span
      className={cn(
        'bg-accent-tint text-accent inline-block rounded-sm px-2 py-1 text-xs font-medium tracking-widest',
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export const Section = {
  Title: ({ className, children, ...props }: ComponentProps<'h3'>): ReactElement => (
    <h3 className={cn('text-fg-default text-base font-bold', className)} {...props}>
      {children}
    </h3>
  ),
  BigTitle: ({ className, children, ...props }: ComponentProps<'h2'>): ReactElement => (
    <h2 className={cn('text-fg-default text-base font-bold', className)} {...props}>
      {children}
    </h2>
  ),
  Subtitle: ({ className, children, ...props }: ComponentProps<'div'>): ReactElement => (
    <div className={cn('text-fg-secondary text-sm', className)} {...props}>
      {children}
    </div>
  ),
};
