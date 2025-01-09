import React, { ReactNode } from 'react';
import { cn } from '@theguild/components';

export interface LargeCalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  variant: 'primary' | 'secondary';
  heading?: string;
  cta?: ReactNode;
}

export function LargeCallout({
  icon,
  heading,
  children,
  cta,
  variant,
  ...rest
}: LargeCalloutProps) {
  return (
    <article
      className={cn(
        'mt-10 flex gap-6 rounded-2xl border border-transparent p-8 max-sm:flex-col sm:items-start sm:gap-12',
        variant === 'primary' && 'bg-primary dark:bg-primary/[0.01] dark:border-primary/5',
        variant === 'secondary' &&
          'border-green-400 bg-white dark:border-neutral-700 dark:bg-neutral-900',
      )}
      {...rest}
    >
      <div>
        <header className="flex gap-2">
          {icon}
          <h3 className="font-medium">{heading}</h3>
        </header>
        {children}
      </div>
      {cta}
    </article>
  );
}

export function DocsIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={24}
      height={25}
      viewBox="0 0 24 25"
      fill="none"
      {...props}
    >
      <path
        d="M21 18.375H6a1 1 0 000 2h15v2H6a3 3 0 01-3-3v-15a2 2 0 012-2h16v16zm-16-1.95c.162-.033.329-.05.5-.05H19v-12H5v12.05zm11-7.05H8v-2h8v2z"
        fill="#00342C"
      />
    </svg>
  );
}
