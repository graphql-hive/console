import { ComponentProps, ReactElement } from 'react';
import { clsx } from 'clsx';
import { statStyles } from './stat.css';

function Stat({ children, className }: ComponentProps<'dl'>): ReactElement {
  return <dl className={clsx(statStyles.root, className)}>{children}</dl>;
}

function Label({ children, className }: ComponentProps<'dt'>): ReactElement {
  return <dt className={clsx(statStyles.label, className)}>{children}</dt>;
}

function Number({ children, className }: ComponentProps<'dd'>): ReactElement {
  return <dd className={clsx(statStyles.number, className)}>{children}</dd>;
}

function HelpText({ children, className }: ComponentProps<'dd'>): ReactElement {
  return <dd className={clsx(statStyles.helpText, className)}>{children}</dd>;
}

export default Object.assign(Stat, { Label, Number, HelpText });
