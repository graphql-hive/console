import { type ReactElement, type ReactNode } from 'react';

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-neutral-2 dark:bg-neutral-1 border-neutral-4 rounded-lg border">
      {children}
    </div>
  );
}

export function CardHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col space-y-1.5 p-5">{children}</div>;
}

export function CardTitle({ title }: { title: string }) {
  return <h3 className="text-neutral-12 text-sm font-medium leading-none">{title}</h3>;
}

export function CardDescription({ description }: { description: ReactElement | string }) {
  return <p className="text-neutral-10 text-[13px]">{description}</p>;
}

export function CardContent({ children }: { children: ReactNode }) {
  return <div className="p-6 pt-0">{children}</div>;
}
