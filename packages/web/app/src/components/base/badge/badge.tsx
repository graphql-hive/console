import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex cursor-default items-center justify-center overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs w-fit shrink-0',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-neutral-6 font-medium text-neutral-11',
        secondary: 'border-transparent bg-neutral-4 font-medium text-neutral-11',
        destructive: 'border-transparent bg-red-600 font-medium text-neutral-2',
        outline: 'border-neutral-5 font-normal text-neutral-11',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

type BadgeProps = {
  content: string;
  variants?: VariantProps<typeof badgeVariants>;
};

export function Badge({ content, variants }: BadgeProps) {
  return <span className={badgeVariants({ ...variants })}>{content}</span>;
}
