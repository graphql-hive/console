import { ReactElement, ReactNode } from 'react';
import { AlertCircleIcon } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/primitives/button/button';
import { cn } from '@/lib/utils';

export function OperationsFallback({
  children,
  state,
  errorMessage,
  refetch,
}: {
  children: ReactNode;
  state: 'fetching' | 'error' | 'empty' | 'success';
  /** What the API said, when the failure is the request's own (a filter it rejected). */
  errorMessage?: string;
  refetch: () => void;
}): ReactElement {
  return (
    <div className="relative">
      <div
        className={cn(
          (state === 'error' || state === 'empty') && 'blur-sm',
          state === 'fetching' || state === 'empty' ? 'opacity-30' : 'opacity-100',
        )}
      >
        {children}
      </div>
      {state === 'empty' ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <Alert className="max-w-[500px]">
            <AlertCircleIcon className="size-4" />
            <AlertTitle>No stats available yet.</AlertTitle>
            <AlertDescription>
              There is no information available for the selected filters.
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      {state === 'error' ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          {errorMessage ? <p className="text-sm text-critical">{errorMessage}</p> : null}
          <Button variant="destructive" onClick={refetch}>
            Failed to load data. Click to retry.
          </Button>
        </div>
      ) : null}
    </div>
  );
}
