import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The content column under a layout's header and nav; every page renders one around its content. */
export function LayoutContent(props: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-h-(--content-height) container pb-7', props.className)}>
      {props.children}
    </div>
  );
}
