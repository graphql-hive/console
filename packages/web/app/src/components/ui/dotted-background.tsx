import React from 'react';
import { clsx } from 'clsx';

export function DottedBackground(props: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'relative flex size-full items-center justify-center bg-surface-inset bg-dot-line-strong',
        props.className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-surface-inset mask-[radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      {props.children}
    </div>
  );
}
