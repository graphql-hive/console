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
});

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
