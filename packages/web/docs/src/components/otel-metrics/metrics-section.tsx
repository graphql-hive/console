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
        <div className="space-y-4">
          <h4 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            Labels Reference
          </h4>
          <div className="grid gap-4">
            {labels.map(label => (
              <LabelCard key={label.name} {...label} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
