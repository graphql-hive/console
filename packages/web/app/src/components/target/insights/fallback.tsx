import { ReactElement, ReactNode } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/primitives/button/button';
import { cn } from '@/lib/utils';
import * as styles from './fallback.css';

export function OperationsFallback({
  children,
  state,
  refetch,
}: {
  children: ReactNode;
  state: 'fetching' | 'error' | 'empty' | 'success';
  refetch: () => void;
}): ReactElement {
  return (
    <div className={styles.operationsFallbackDiv}>
      <div
        className={cn(
          (state === 'error' || state === 'empty') && styles.operationsFallbackDiv2,
          state === 'fetching' || state === 'empty'
            ? styles.operationsFallbackDiv3
            : styles.operationsFallbackDiv4,
        )}
      >
        {children}
      </div>
      {state === 'empty' ? (
        <div className={styles.operationsFallbackDiv5}>
          <Alert className={styles.operationsFallbackAlert}>
            <AlertCircleIcon className={styles.operationsFallbackAlertCircleIcon} />
            <AlertTitle>No stats available yet.</AlertTitle>
            <AlertDescription>
              There is no information available for the selected filters.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      {state === 'error' ? (
        <div className={styles.operationsFallbackDiv6}>
          <Button variant="destructive" onClick={refetch}>
            Failed to load data. Click to retry.
          </Button>
        </div>
      ) : null}
    </div>
  );
}
