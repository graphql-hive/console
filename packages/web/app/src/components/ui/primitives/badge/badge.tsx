import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { Tooltip } from '../floating/tooltip/tooltip';
import { badgeStyles } from './badge.css';

const badgeVariants = lenient(badgeStyles.root);

type BadgeProps = {
  content: string;
  /** Leads the text, in the text's colour. */
  icon?: LucideIcon;
  variants?: Omit<NonNullable<Parameters<typeof badgeVariants>[0]>, 'focusable'>;
  // The sentence a short badge stands for.
  tooltip?: ReactNode;
};

export function Badge({ content, icon: Icon, variants, tooltip }: BadgeProps) {
  const children = (
    <>
      {Icon ? <Icon aria-hidden className={badgeStyles.icon[variants?.size ?? 'default']} /> : null}
      {content}
    </>
  );
  if (!tooltip) {
    return <span className={badgeVariants({ ...variants })}>{children}</span>;
  }
  return (
    <Tooltip
      trigger={
        // The focus stop is what lets a keyboard user reach the tooltip; a span is the right
        // element because the badge is a label, not a control.
        // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        <span tabIndex={0} className={badgeVariants({ ...variants, focusable: true })}>
          {children}
        </span>
      }
      content={tooltip}
    />
  );
}
