import React from 'react';
import { toDecimal } from './use-decimal';
import { formatNumber } from './use-formatted-number';

export function formatRpm(rpm: number) {
  if (rpm >= 1000) {
    return formatNumber(rpm);
  }

  if (rpm >= 100) {
    return toDecimal(rpm, 2);
  }

  if (rpm >= 10) {
    return toDecimal(rpm, 3);
  }

  return toDecimal(rpm, 4);
}

export function formatThroughput(requests: number, window: number) {
  const distance = window / (60 * 1000);
  return formatRpm(requests / distance);
}

export function useFormattedThroughput({
  requests,
  window,
}: {
  requests?: number;
  window: number;
}) {
  return React.useMemo(
    () => (typeof requests === 'undefined' ? '-' : formatThroughput(requests, window)),
    [requests, window],
  );
}
