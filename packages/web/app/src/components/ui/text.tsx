import { type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const textVariants = cva('inline', {
  variants: {
    arrangement: {
      inline: 'inline',
      block: 'block',
    },
    color: {
      primary: 'text-neutral-12',
      secondary: 'text-neutral-11',
    },
    size: {
      'x-small': 'text-xs',
      small: 'text-sm',
      medium: 'text-base',
      large: 'text-lg',
      'x-large': 'text-xl',
    },
    weight: {
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
  },
  defaultVariants: {
    arrangement: 'block',
    color: 'primary',
    size: 'medium',
    weight: 'normal',
  },
});

type TextVariantProps = VariantProps<typeof textVariants>;

type TextElement = 'p' | 'span';

type TextProps = {
  as?: TextElement;
  children?: ReactNode;
  className?: string;
} & TextVariantProps;

export function Text({ as, color, size, weight, align, className, children }: TextProps) {
  const Component = as || 'span';

  return (
    <Component className={cn(textVariants({ color, size, weight, align }), className)}>
      {children}
    </Component>
  );
}
