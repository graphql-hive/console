import { nsToMs } from '../../../shared/helpers';
import type { DurationValuesResolvers } from './../../../__generated__/types';

export const DurationValues: DurationValuesResolvers = {
  avg: value => {
    return transformPercentile(value.avg);
  },
  p75: value => {
    return transformPercentile(value.p75);
  },
  p90: value => {
    return transformPercentile(value.p90);
  },
  p95: value => {
    return transformPercentile(value.p95);
  },
  p99: value => {
    return transformPercentile(value.p99);
  },
};

function transformPercentile(value: number | null): number {
  return value ? Math.round(nsToMs(value)) : 0;
}
