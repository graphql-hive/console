import React from 'react';
import { clsx } from 'clsx';
import { dottedBackgroundStyles } from './dotted-background.css';

export function DottedBackground(props: { children: React.ReactNode; className?: string }) {
  return (
    <div className={clsx(dottedBackgroundStyles.root, props.className)}>
      <div className={dottedBackgroundStyles.vignette} />
      {props.children}
    </div>
  );
}
