import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function EditorTitle(props: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('cursor-default text-base font-semibold tracking-tight', props.className)}>
      {props.children}
    </div>
  );
}
