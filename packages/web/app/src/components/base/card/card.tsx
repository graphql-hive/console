import { type ReactElement, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const cardVariants = cva('rounded-md border', {
  variants: {
    onSurface: {
      base: 'border-line',
      raised: 'bg-surface-card border-line-subtle',
    },
    // For a card that is itself a link or button. The hover fill moves one step in the same
    // direction the surface already inverts, so it reads as "lifted" in both themes.
    interactive: {
      true: 'hover:bg-surface-card-hover hover:border-line',
    },
  },
  defaultVariants: {
    onSurface: 'base',
  },
});

const cardBodyVariants = cva('', {
  variants: {
    // `none` is for content that runs edge to edge (a chart, a table, a full-bleed image) and
    // supplies its own insets where it needs them.
    bodyPadding: {
      default: 'p-5',
      none: '',
    },
  },
  defaultVariants: {
    bodyPadding: 'default',
  },
});

const cardTitleVariants = cva('text-fg font-medium leading-none', {
  variants: {
    titleSize: {
      default: 'text-sm',
      large: 'text-lg',
      xlarge: 'text-2xl',
    },
  },
  defaultVariants: {
    titleSize: 'default',
  },
});

type CardProps = {
  title?: string;
  description?: ReactElement | string;
  children?: ReactNode;
  variants?: VariantProps<typeof cardVariants> &
    VariantProps<typeof cardTitleVariants> &
    VariantProps<typeof cardBodyVariants>;
};

export function Card({ children, title, description, variants }: CardProps) {
  const hasHeader = !!(title || description);

  return (
    <div className={cardVariants({ ...variants })}>
      {hasHeader ? (
        <div className="flex flex-col space-y-1.5 p-5">
          {title ? <h3 className={cardTitleVariants({ ...variants })}>{title}</h3> : null}
          {description ? <p className="text-fg-secondary text-control">{description}</p> : null}
        </div>
      ) : null}
      {children ? (
        <div className={cn(cardBodyVariants({ ...variants }), hasHeader && 'pt-0')}>{children}</div>
      ) : null}
    </div>
  );
}
