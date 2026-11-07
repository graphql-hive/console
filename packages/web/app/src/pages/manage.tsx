import { useCallback, useState } from 'react';
import { AdminStats, Filters } from '@/components/admin/admin-stats';
import { DateRangePicker, presetLast7Days } from '@/components/ui/date-range-picker';
import { Checkbox } from '@/components/ui/primitives/checkbox/checkbox';
import { Tooltip } from '@/components/ui/primitives/floating/tooltip/tooltip';
import { useDateRangeController } from '@/lib/hooks/use-date-range-controller';
import * as shared from '@/styles/shared.css';
import * as styles from './manage.css';

type FilterKey = keyof Filters;

const CHECKBOXES: { value: FilterKey; label: string; tooltip?: string }[] = [
  { value: 'with-projects', label: 'With Projects' },
  { value: 'with-targets', label: 'With Targets' },
  { value: 'with-schema-pushes', label: 'With Schema Pushes' },
  { value: 'with-persisted', label: 'With Persisted' },
  { value: 'with-collected', label: 'With Collected' },
];

export function ManagePage() {
  const dateRangeController = useDateRangeController({
    dataRetentionInDays: 365,
    defaultPreset: presetLast7Days,
  });
  const [filters, setFilters] = useState<Filters>({});
  const onFiltersChange = useCallback(
    (keys: FilterKey[]) => {
      const newFilters: {
        [key in FilterKey]: boolean;
      } = {
        'with-collected': false,
        'with-schema-pushes': false,
        'with-persisted': false,
        'with-projects': false,
        'with-targets': false,
      };

      for (const key of keys) {
        newFilters[key] = true;
      }

      setFilters(newFilters);
    },
    [setFilters, filters],
  );

  return (
    <div className={styles.managePageDiv}>
      <h2 className={styles.managePageH2}>Hive Stats</h2>
      <div className={shared.stack.base}>
        <div className={styles.managePageDiv3}>
          <DateRangePicker
            selectedRange={dateRangeController.selectedPreset.range}
            startDate={dateRangeController.startDate}
            align="end"
            onUpdate={args => dateRangeController.setSelectedPreset(args.preset)}
          />
          <>
            {CHECKBOXES.map(({ value, label, tooltip }) => (
              <span className={shared.row.gap2} key={value}>
                <Checkbox
                  onCheckedChange={isChecked => {
                    const newFilters = {
                      ...filters,
                      [value]: isChecked,
                    };

                    return onFiltersChange(
                      Object.entries(newFilters)
                        .filter(([, v]) => v)
                        .map(([k]) => k) as any,
                    );
                  }}
                  checked={filters[value]}
                  id={value}
                />
                {tooltip ? (
                  <Tooltip
                    trigger={
                      <label htmlFor={value} className={styles.managePageLabel}>
                        {label}
                      </label>
                    }
                    content={tooltip}
                  />
                ) : (
                  <label htmlFor={value} className={styles.managePageLabel2}>
                    {label}
                  </label>
                )}
              </span>
            ))}
          </>
        </div>
        <AdminStats
          resolution={dateRangeController.resolution}
          dateRange={dateRangeController.resolvedRange}
          filters={filters}
        />
      </div>
    </div>
  );
}
