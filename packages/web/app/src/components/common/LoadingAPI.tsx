import { memo } from 'react';
import { clsx } from 'clsx';
import { useInflightRequests } from '@/lib/urql-exchanges/state';
import { loadingApiStyles } from './LoadingAPI.css';

export const LoadingAPIIndicator = memo(() => {
  const inflightRequests = useInflightRequests();
  const isFetching = inflightRequests > 0;

  if (!isFetching) return null;

  return <div className={clsx(loadingApiStyles.bar, 'hive-loading-indicator')} />;
});
