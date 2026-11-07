import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { pageStyles } from './page.css';

export function Title({ children, className }: { children: ReactNode; className?: string }) {
  return <h3 className={cn(pageStyles.title, className)}>{children}</h3>;
}

export function Subtitle({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn(pageStyles.subtitle, className)}>{children}</p>;
}
