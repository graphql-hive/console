import { type ReactNode } from 'react';
import { lenient } from '@/lib/recipe';
import { cn } from '@/lib/utils';
import { textStyles } from './text.css';

const textVariants = lenient(textStyles.root);

type TextVariantProps = NonNullable<Parameters<typeof textVariants>[0]>;

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
