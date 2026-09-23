import { ReactNode } from 'react';
import { focusRingQuiet } from '@/components/base/shared-styles';
import { cn } from '@/lib/utils';

/**
 * The item of a vertical sub-page nav: a settings section, or a target's alerts pages. A nav
 * item rather than a Button, so it carries its own classes; the alerts page puts them on router
 * links.
 */
export const subPageNavigationLinkClasses = {
  base: cn(
    'inline-flex items-center justify-start rounded-md px-4 py-2 text-left text-sm font-medium transition-colors',
    focusRingQuiet,
  ),
  active:
    'text-neutral-12 bg-neutral-5 hover:bg-neutral-5 dark:bg-neutral-3 dark:hover:bg-neutral-3',
  inactive: 'text-neutral-11 hover:text-neutral-12 hover:underline',
};

type SubPageNavigationLinkProps = {
  dataCy?: string;
  isActive: boolean;
  onClick: () => void;
  title: ReactNode;
};

export function SubPageNavigationLink({
  dataCy,
  isActive,
  onClick,
  title,
}: SubPageNavigationLinkProps) {
  return (
    <button
      type="button"
      data-cy={dataCy}
      className={cn(
        subPageNavigationLinkClasses.base,
        isActive ? subPageNavigationLinkClasses.active : subPageNavigationLinkClasses.inactive,
      )}
      onClick={onClick}
    >
      {title}
    </button>
  );
}
