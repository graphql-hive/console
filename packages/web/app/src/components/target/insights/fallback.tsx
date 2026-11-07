import { ReactElement, ReactNode } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/primitives/button/button';
import * as shared from '@/styles/shared.css';
import { fallbackStyles } from './fallback.css';

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
    <div className={shared.relative}>
      <div
        className={fallbackStyles.content({
          blurred: state === 'error' || state === 'empty',
          dimmed: state === 'fetching' || state === 'empty',
        })}
      >
        {children}
      </div>
      {state === 'empty' ? (
        <div className={fallbackStyles.overlay}>
          <Alert className={fallbackStyles.alert}>
            <AlertCircleIcon className={fallbackStyles.alertIcon} />
            <AlertTitle>No stats available yet.</AlertTitle>
            <AlertDescription>
              There is no information available for the selected filters.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      {state === 'error' ? (
        <div className={fallbackStyles.overlay}>
          <Button variant="destructive" onClick={refetch}>
            Failed to load data. Click to retry.
          </Button>
        </div>
      ) : null}
    </div>
  );
}
