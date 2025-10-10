import { cn } from '@/lib/utils';

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('bg-primary/10 animate-pulse rounded-md align-middle', className)}
      {...props}
    />
  );
}

export { Skeleton };
