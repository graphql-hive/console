import { cva, type VariantProps } from 'class-variance-authority';

// bg-fixed pins the gradient to the viewport, so every skeleton on the page shares one shimmer
// instead of each running its own.
const skeletonVariants = cva(
  [
    'bg-surface-skeleton block shrink-0 animate-skeleton bg-fixed bg-size-[200%_100%]',
    'bg-[linear-gradient(100deg,transparent_35%,hsl(var(--accent)/0.12)_75%,transparent_85%)]',
    'motion-reduce:animate-none motion-reduce:bg-none',
  ],
  {
    variants: {
      shape: {
        /** A line of text. */
        line: 'rounded-sm',
        /** Fills the box its parent sizes: a table row, a chart, a card body. */
        block: 'size-full rounded-sm',
        /** An avatar. */
        circle: 'rounded-full',
      },
      size: { xs: '', sm: '', default: '', lg: '', xl: '' },
      width: { xs: '', sm: '', md: '', lg: '', xl: '', full: '' },
    },
    compoundVariants: [
      // Line heights follow the text they stand in for, caption through title.
      { shape: 'line', size: 'xs', className: 'h-2' },
      { shape: 'line', size: 'sm', className: 'h-3' },
      { shape: 'line', size: 'default', className: 'h-4' },
      { shape: 'line', size: 'lg', className: 'h-5' },
      { shape: 'line', size: 'xl', className: 'h-6' },
      { shape: 'line', width: 'xs', className: 'w-12' },
      { shape: 'line', width: 'sm', className: 'w-24' },
      { shape: 'line', width: 'md', className: 'w-48' },
      { shape: 'line', width: 'lg', className: 'w-72' },
      { shape: 'line', width: 'xl', className: 'w-96' },
      { shape: 'line', width: 'full', className: 'w-full' },
      { shape: 'circle', size: ['xs', 'sm'], className: 'size-6' },
      // The app's avatars are size-9.
      { shape: 'circle', size: 'default', className: 'size-9' },
      { shape: 'circle', size: ['lg', 'xl'], className: 'size-10' },
    ],
    defaultVariants: { shape: 'line', size: 'default', width: 'md' },
  },
);

type SkeletonProps = {
  variants?: VariantProps<typeof skeletonVariants>;
};

export function Skeleton({ variants }: SkeletonProps) {
  return <span aria-hidden className={skeletonVariants({ ...variants })} />;
}
