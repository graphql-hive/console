import { type ReactElement, type ReactNode } from 'react';
import { lenient } from '@/lib/recipe';
import { cardStyles } from './card.css';

export const cardVariants = lenient(cardStyles.root);

const cardTitleVariants = lenient(cardStyles.title);

const cardBodyVariants = lenient(cardStyles.body);

type CardProps = {
  title?: string;
  description?: ReactElement | string;
  actions?: ReactNode;
  children?: ReactNode;
  variants?: NonNullable<Parameters<typeof cardVariants>[0]> &
    NonNullable<Parameters<typeof cardTitleVariants>[0]> &
    Omit<NonNullable<Parameters<typeof cardBodyVariants>[0]>, 'afterHeader'>;
};

export function Card({ children, title, description, actions, variants }: CardProps) {
  const hasHeader = !!(title || description || actions);

  return (
    <div className={cardVariants({ ...variants })}>
      {hasHeader ? (
        <div className={cardStyles.header}>
          {title || actions ? (
            <div className={cardStyles.titleRow}>
              {title ? <h3 className={cardTitleVariants({ ...variants })}>{title}</h3> : null}
              {actions ? <div className={cardStyles.actions}>{actions}</div> : null}
            </div>
          ) : null}
          {description ? <p className={cardStyles.description}>{description}</p> : null}
        </div>
      ) : null}
      {children ? (
        <div className={cardBodyVariants({ ...variants, afterHeader: hasHeader })}>{children}</div>
      ) : null}
    </div>
  );
}
