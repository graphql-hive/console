import {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { startOfDay } from 'date-fns';
import { z } from 'zod';
import { Period, resolveRange } from '@/lib/date-math';
import { subDays } from '@/lib/date-time';
import { useLocalStorageJson } from '@/lib/hooks';
import { useSearchParamsFilter } from '@/lib/hooks/use-search-params-filters';
import { UTCDate } from '@date-fns/utc';

type SchemaExplorerContextType = {
  isArgumentListCollapsed: boolean;
  setArgumentListCollapsed(isCollapsed: boolean): void;
  setDataRetentionInDays(days: number): void;
  dataRetentionInDays: number;
  startDate: Date;
  period: Period;
  setPeriod(period: { from: string; to: string }): void;
  /** the actual date. */
  resolvedPeriod: { from: string; to: string };
  /** refresh the resolved period (aka trigger refetch) */
  refreshResolvedPeriod(): void;
  setMetadataFilter(name: string, value: string): void;
  bulkSetMetadataFilter(filters: Array<{ name: string, values: string[] }>): void;
  unsetMetadataFilter(name: string, value: string): void;
  hasMetadataFilter(name: string, value: string): boolean;
  clearMetadataFilter(): void;
  metadata: string[];
};

const defaultPeriod: Period = {
  from: 'now-7d',
  to: 'now',
};

const SchemaExplorerContext = createContext<SchemaExplorerContextType>({
  isArgumentListCollapsed: true,
  setArgumentListCollapsed: () => {},
  dataRetentionInDays: 7,
  startDate: startOfDay(subDays(new UTCDate(), 7)),
  period: defaultPeriod,
  resolvedPeriod: resolveRange(defaultPeriod),
  setPeriod: () => {},
  setDataRetentionInDays: () => {},
  refreshResolvedPeriod: () => {},
  setMetadataFilter: () => {},
  bulkSetMetadataFilter: () => {},
  unsetMetadataFilter: () => {},
  hasMetadataFilter: () => false,
  clearMetadataFilter: () => {},
  metadata: [],
});

function filterUnique(array: string[]) {
  return array.filter((value, index, self) => self.indexOf(value) === index);
}

export function SchemaExplorerProvider({ children }: { children: ReactNode }): ReactElement {
  const [dataRetentionInDays, setDataRetentionInDays] = useState(
    7 /* Minimum possible data retention period - Free plan */,
  );

  const startDate = useMemo(
    () => startOfDay(subDays(new UTCDate(), dataRetentionInDays)),
    [dataRetentionInDays],
  );

  const [isArgumentListCollapsed, setArgumentListCollapsed] = useLocalStorageJson(
    'hive:schema-explorer:collapsed',
    z.boolean().default(true),
  );
  const [period, setPeriod] = useLocalStorageJson(
    'hive:schema-explorer:period-1',
    Period.default(defaultPeriod),
  );
  const [resolvedPeriod, setResolvedPeriod] = useState<Period>(() => resolveRange(period));
  const [metadata, setMetadataFilter] = useSearchParamsFilter('meta', [] as string[]);

  return (
    <SchemaExplorerContext.Provider
      value={{
        isArgumentListCollapsed,
        setArgumentListCollapsed,
        period,
        setPeriod(period) {
          setPeriod(period);
          setResolvedPeriod(resolveRange(period));
        },
        dataRetentionInDays,
        setDataRetentionInDays,
        startDate,
        resolvedPeriod,
        refreshResolvedPeriod() {
          setResolvedPeriod(resolveRange(period));
        },
        setMetadataFilter(name, value) {
          setMetadataFilter(filterUnique([...metadata, `${name}:${value}`]));
        },
        bulkSetMetadataFilter(filters) {
          setMetadataFilter(filters.flatMap(f => f.values.map(v => `${f.name}:${v}`)));
        },
        unsetMetadataFilter(name, value) {
          const data = [...metadata];
          const index = data.indexOf(`${name}:${value}`);
          if (index >= 0) {
            data.splice(index, 1);
            setMetadataFilter(data);
          }
        },
        clearMetadataFilter() {
          setMetadataFilter([]);
        },
        hasMetadataFilter(name, value) {
          return metadata.includes(`${name}:${value}`);
        },
        metadata,
      }}
    >
      {children}
    </SchemaExplorerContext.Provider>
  );
}

export function useSchemaExplorerContext() {
  return useContext(SchemaExplorerContext);
}

export function useArgumentListToggle() {
  const { isArgumentListCollapsed, setArgumentListCollapsed } = useSchemaExplorerContext();
  const toggle = useCallback(() => {
    setArgumentListCollapsed(!isArgumentListCollapsed);
  }, [setArgumentListCollapsed, isArgumentListCollapsed]);

  return [isArgumentListCollapsed, toggle] as const;
}

export function usePeriodSelector() {
  const { period, setPeriod, startDate, refreshResolvedPeriod } = useSchemaExplorerContext();
  return {
    setPeriod,
    period,
    startDate,
    refreshResolvedPeriod,
  };
}
