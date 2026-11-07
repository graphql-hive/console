import { type ReactNode } from 'react';
import * as shared from '@/styles/shared.css';
import * as styles from './scope-bar.css';

type ScopeBarProps = {
  picker: ReactNode;
  label?: string;
};

/** Sits above a TabbedView: the picker that scopes every tab. */
export function ScopeBar({ picker, label = 'Viewing' }: ScopeBarProps) {
  return (
    <div className={shared.row.gap2}>
      <span className={styles.scopeBarSpan}>{label}</span>
      {picker}
    </div>
  );
}
