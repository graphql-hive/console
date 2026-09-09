import { type ReactElement, type ReactNode } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const cardVariants = cva('rounded-md border', {
  variants: {
    // `base` has no fill, so it leans on the stronger border to read against the page.
    // `raised` inverts with the theme because the page does: index.css sets the body to
    // neutral-3 in light and neutral-2 in dark, so a flat fill would vanish in one of them.
    // These two values keep the card one step off the page either way.
    onSurface: {
      base: 'border-neutral-5',
      raised: 'bg-neutral-2 dark:bg-neutral-3 border-neutral-4',
    },
    // For a card that is itself a link or button. The hover fill moves one step in the same
    // direction the surface already inverts, so it reads as "lifted" in both themes.
    interactive: {
      true: 'hover:bg-neutral-1 dark:hover:bg-neutral-4 hover:border-neutral-5',
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

const cardTitleVariants = cva('text-neutral-12 font-medium leading-none', {
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
          {description ? <p className="text-neutral-10 text-[13px]">{description}</p> : null}
        </div>
      ) : null}
      {/* The header already supplies the top inset when it is present, so the body drops it to
          avoid doubling the gap. Without a header the body owns all four sides. `pt-0` is inert
          under `bodyPadding: 'none'`, so the two variants need no compound case. */}
      {children ? (
        <div className={cn(cardBodyVariants({ ...variants }), hasHeader && 'pt-0')}>{children}</div>
      ) : null}
    </div>
  );
}
