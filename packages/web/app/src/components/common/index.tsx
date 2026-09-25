import { ComponentProps, ReactElement, ReactNode } from 'react';
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

export const Page = ({
  title,
  subtitle = '',
  actions,
  children,
  noPadding,
  className,
}: {
  children: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactElement;
  noPadding?: boolean;
  className?: string;
}): ReactElement => {
  return (
    <div className={cn('relative flex h-full flex-col', className)}>
      <div className="flex shrink-0 flex-row items-center justify-between p-4">
        <div>
          <h2 className="text-neutral-1 text-xl font-bold">{title}title</h2>
          <span className="text-neutral-8 mt-2 text-sm">{subtitle}</span>
        </div>
        <div className="flex flex-row items-center space-x-2">{actions}</div>
      </div>
      {noPadding ? children : <div className="h-full px-4 pb-4">{children}</div>}
    </div>
  );
};

export const Section = {
  Title: ({ className, children, ...props }: ComponentProps<'h3'>): ReactElement => (
    <h3 className={cn('text-neutral-11 text-base font-bold', className)} {...props}>
      {children}
    </h3>
  ),
  BigTitle: ({ className, children, ...props }: ComponentProps<'h2'>): ReactElement => (
    <h2 className={cn('text-neutral-11 text-base font-bold', className)} {...props}>
      {children}
    </h2>
  ),
  Subtitle: ({ className, children, ...props }: ComponentProps<'div'>): ReactElement => (
    <div className={cn('text-neutral-10 text-sm', className)} {...props}>
      {children}
    </div>
  ),
};
