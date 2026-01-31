import React from 'react';
import { clsx } from 'clsx';

export function DottedBackground(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'bg-dot-neutral-12/20 bg-neutral-1 relative flex size-full items-center justify-center',
        props.className,
      )}
    >
      <div className="bg-neutral-1 mask-[radial-gradient(ellipse_at_center,transparent_20%,black)] pointer-events-none absolute inset-0 flex items-center justify-center" />
      {props.children}
    </div>
  );
}
