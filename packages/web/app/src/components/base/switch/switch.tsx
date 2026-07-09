import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Switch as BaseSwitch } from '@base-ui/react/switch';

const switchRootVariants = cva(
  'data-[unchecked]:bg-neutral-6 relative inline-flex shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-2 disabled:cursor-not-allowed disabled:opacity-50 data-[checked]:bg-success_80',
  {
    variants: {
      size: {
        standard: 'h-5 w-10 p-0.5 ',
        small: 'h-2.5 w-6',
      },
    },
    defaultVariants: {
      size: 'standard',
    },
  },
);

const switchThumbVariants = cva(
  'pointer-events-none block rounded-full bg-neutral-12 shadow-sm transition-transform',
  {
    variants: {
      size: {
        standard: 'size-4 data-[checked]:translate-x-5',
        small: 'size-[13px] data-[checked]:translate-x-[11px]',
      },
    },
    defaultVariants: {
      size: 'standard',
    },
  },
);

export function Switch({
  size,
  className,
  ...props
}: Omit<BaseSwitch.Root.Props, 'className'> &
  VariantProps<typeof switchRootVariants> & { className?: string }) {
  return (
    <BaseSwitch.Root className={cn(switchRootVariants({ size }), className)} {...props}>
      <BaseSwitch.Thumb className={switchThumbVariants({ size })} />
    </BaseSwitch.Root>
  );
}
