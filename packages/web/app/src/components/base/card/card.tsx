import { type ComponentProps, type ReactElement, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const cardVariants = cva('rounded-lg border', {
  variants: {
    variant: {
      default: '',
      selectable: 'hover:border-neutral-10 flex-1 cursor-pointer transition-colors',
      selected: 'border-border-neutral-10 bg-neutral-3 flex-1 cursor-pointer transition-colors',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export function Card({
  children,
  variant,
  ...props
}: Omit<ComponentProps<'div'>, 'className' | 'style'> & VariantProps<typeof cardVariants>) {
  return (
    <div className={cardVariants({ variant })} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col space-y-1.5 p-5">{children}</div>;
}

export function CardTitle({ title }: { title: string }) {
  return <h3 className="text-neutral-12 text-sm font-medium leading-none">{title}</h3>;
}

export function CardDescription({ description }: { description: ReactElement | string }) {
  return <p className="text-neutral-10 text-[13px]">{description}</p>;
}

const cardContentVariants = cva('', {
  variants: {
    variant: {
      default: 'p-6 pt-0',
      selection: 'flex items-start gap-3 p-4',
    },
  },
  defaultVariants: {
    variant: 'default',
  },
});

export function CardContent({
  children,
  variant,
}: { children: ReactNode } & VariantProps<typeof cardContentVariants>) {
  return <div className={cardContentVariants({ variant })}>{children}</div>;
}
