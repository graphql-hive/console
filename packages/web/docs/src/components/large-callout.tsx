import React, { ReactNode } from 'react';

export interface LargeCalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  variant?: 'primary' | 'secondary';
  heading?: string;
  cta?: ReactNode;
}

export function LargeCallout({ icon, heading, children, cta, ...rest }: LargeCalloutProps) {
  return (
    <article {...rest}>
      <div>
        <header>
          {icon}
          <h3>{heading}</h3>
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
