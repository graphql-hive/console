import { useEffect, useRef, useState } from 'react';
import { Activity, BarChart3, Gauge, TrendingUp } from 'lucide-react';

interface MetricCardProps {
  name: string;
  type: 'Counter' | 'Histogram' | 'UpDownCounter' | 'Gauge';
  unit?: string;
  description?: string;
  labels?: string[];
}

const typeConfig = {
  Counter: {
    icon: TrendingUp,
    color:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700/50',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  Histogram: {
    icon: BarChart3,
    color:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700/50',
    badge: 'bg-blue-100 text-blue-800',
  },
  UpDownCounter: {
    icon: Activity,
    color:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700/50',
    badge: 'bg-amber-100 text-amber-800',
  },
  Gauge: {
    icon: Gauge,
    color:
      'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/60 dark:text-slate-100 dark:border-slate-700',
    badge: 'bg-slate-100 text-slate-800',
  },
};

export function MetricCard({ name, type, unit, description, labels }: MetricCardProps) {
  const config = typeConfig[type];
  const Icon = config.icon;
  const [isCopied, setIsCopied] = useState(false);
  const copiedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const metricId = `metric-${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')}`;

  useEffect(() => {
    return () => {
      if (copiedTimeoutRef.current) {
        clearTimeout(copiedTimeoutRef.current);
      }
    };
  }, []);

  function showCopiedState() {
    setIsCopied(true);

    if (copiedTimeoutRef.current) {
      clearTimeout(copiedTimeoutRef.current);
    }

    copiedTimeoutRef.current = setTimeout(() => {
      setIsCopied(false);
    }, 1200);
  }

  async function copyMetricLink() {
    if (typeof window === 'undefined') {
      return;
    }

    const metricUrl = `${window.location.origin}${window.location.pathname}${window.location.search}#${metricId}`;

    try {
      await navigator.clipboard.writeText(metricUrl);
      showCopiedState();
    } catch {
      window.location.hash = metricId;
    }
  }

  return (
    <div
      id={metricId}
      className="group scroll-mt-20 overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow duration-200 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 dark:hover:shadow-black/30"
    >
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <code className="break-all text-sm font-semibold text-gray-900 dark:text-slate-100">
                {name}
              </code>
              <button
                type="button"
                onClick={() => {
                  void copyMetricLink();
                }}
                className={`hive-focus inline-flex items-center justify-center rounded font-mono text-sm font-semibold leading-none transition-all duration-200 ${isCopied ? 'translate-y-0 text-gray-500 opacity-100 dark:text-slate-500' : 'translate-y-0 text-gray-500 opacity-0 hover:text-gray-700 focus:text-gray-700 group-focus-within:opacity-100 group-hover:opacity-100 dark:text-slate-500 dark:hover:text-slate-200 dark:focus:text-slate-200'}`}
                aria-label={`Copy link to ${name}`}
                title="Copy metric link"
              >
                {isCopied ? (
                  <>
                    <span>✓</span>
                    <span className="ml-1 text-xs">copied</span>
                  </>
                ) : (
                  '#'
                )}
              </button>
              <span className="sr-only" aria-live="polite">
                {isCopied ? `Copied link to ${name}` : ''}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {unit && (
              <div className="flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs text-gray-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200">
                <span className="font-medium text-gray-500 dark:text-slate-300">Unit:</span>
                <code>{unit}</code>
              </div>
            )}
            <div
              className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 ${config.color}`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{type}</span>
            </div>
          </div>
        </div>

        {description && (
          <p className="mb-4 text-sm leading-relaxed text-gray-600 dark:text-slate-100">
            {description}
          </p>
        )}

        {labels && labels.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-4 dark:border-neutral-800">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-xs font-semibold uppercase text-gray-700 dark:text-slate-100">
                Labels
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {labels.map(label => (
                <code
                  key={label}
                  className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-700 transition-colors hover:border-gray-300 dark:border-neutral-700 dark:bg-neutral-800 dark:text-slate-200 dark:hover:border-neutral-600"
                >
                  {label}
                </code>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
