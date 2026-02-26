'use client';

import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { LabelCard } from './label-card';
import { MetricCard } from './metric-card';

interface Metric {
  name: string;
  type: 'Counter' | 'Histogram' | 'UpDownCounter' | 'Gauge';
  unit?: string;
  description?: string;
  labels?: string[];
}

interface Label {
  name: string;
  meaning: string;
  typicalValues: string[];
  notes?: string;
}

interface MetricsSectionProps {
  title?: string;
  description?: string;
  metrics?: Metric[];
  labels?: Label[];
}
export function MetricsSection({ metrics, labels }: MetricsSectionProps) {
  const [isLabelsOpen, setIsLabelsOpen] = useState(false);
  const labelsRegionId = useId();

  return (
    <div className="space-y-6">
      {metrics && metrics.length > 0 && (
        <div className="space-y-4">
          <h4 className="mt-8 text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Metrics
          </h4>
          <div className="grid gap-4">
            {metrics.map(metric => (
              <MetricCard key={metric.name} {...metric} />
            ))}
          </div>
        </div>
      )}

      {labels && labels.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <button
            type="button"
            onClick={() => setIsLabelsOpen(current => !current)}
            aria-expanded={isLabelsOpen}
            aria-controls={labelsRegionId}
            className="hive-focus flex w-full items-center justify-between px-5 py-4 text-left text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100"
          >
            <span>Labels Reference</span>
            <ChevronDown
              className={`h-5 w-5 transition-transform duration-200 ${isLabelsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          <div
            id={labelsRegionId}
            className={`overflow-hidden transition-[max-height,opacity] duration-300 ease-out ${isLabelsOpen ? 'max-h-[4000px] opacity-100' : 'max-h-0 opacity-90'}`}
          >
            <div className="border-t border-gray-100 px-5 pb-5 dark:border-neutral-800">
              <div className="divide-y divide-gray-100 pt-2 dark:divide-neutral-800">
                {labels.map(label => (
                  <div key={label.name} className="py-6">
                    <LabelCard {...label} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
