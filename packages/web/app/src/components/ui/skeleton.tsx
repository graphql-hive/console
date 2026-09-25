import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-surface-skeleton animate-pulse rounded-md align-middle', className)}
      {...props}
    />
  );
}

export { Skeleton };
