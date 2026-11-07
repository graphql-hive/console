import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { lenient } from '@/lib/recipe';
import { cn } from '@/lib/utils';
import { Tooltip } from '../floating/tooltip/tooltip';
import { focusRingQuiet } from '../shared-styles';
import * as styles from './badge.css';

const badgeVariants = lenient(styles.badgeVariants);

type BadgeProps = {
  content: string;
  /** Leads the text, in the text's colour. */
  icon?: LucideIcon;
  variants?: NonNullable<Parameters<typeof badgeVariants>[0]>;
  // The sentence a short badge stands for.
  tooltip?: ReactNode;
};

export function Badge({ content, icon: Icon, variants, tooltip }: BadgeProps) {
  const children = (
    <>
      {Icon ? (
        <Icon
          aria-hidden
          className={variants?.size === 'sm' ? styles.badgeIcon : styles.badgeIcon2}
        />
      ) : null}
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
        <span tabIndex={0} className={cn(badgeVariants({ ...variants }), focusRingQuiet)}>
          {children}
        </span>
      }
      content={tooltip}
    />
  );
}
