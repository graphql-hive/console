import type { ReactNode } from 'react';
import { useTheme } from '@/components/theme/theme-provider';
import { useWorkerPool, WorkerPoolContextProvider } from '@pierre/diffs/react';
import WorkerUrl from '@pierre/diffs/worker/worker.js?worker&url';
import { useLayoutEffect } from '@tanstack/react-router';

export function workerFactory(): Worker {
  return new Worker(WorkerUrl, { type: 'module' });
}

/**
 * @docs https://diffs.com/docs#worker-pool
 */
export function DiffsWorkerPoolProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <WorkerPoolContextProvider
      poolOptions={{
        workerFactory,
      }}
      highlighterOptions={{
        theme: resolvedTheme === 'dark' ? 'pierre-dark' : 'pierre-light',
        langs: ['graphql'],
      }}
    >
      {children}
      <ThemeSwitcher />
    </WorkerPoolContextProvider>
  );
}

function ThemeSwitcher() {
  const workerPool = useWorkerPool();
  const { resolvedTheme } = useTheme();

  useLayoutEffect(() => {
    void workerPool?.setRenderOptions({
      theme: resolvedTheme === 'dark' ? 'pierre-dark' : 'pierre-light',
    });
  }, [resolvedTheme]);

  return null;
}
