import {
  createContext,
  ReactElement,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { formatISO, subDays } from 'date-fns';
import { useLocalStorage } from '@/lib/hooks';

type PeriodOption = '365d' | '180d' | '90d' | '30d' | '14d' | '7d';

type Period = {
  from: string;
  to: string;
};

function floorDate(date: Date): Date {
  const time = 1000 * 60;
  return new Date(Math.floor(date.getTime() / time) * time);
}

function createPeriod(option: PeriodOption): Period {
  const now = floorDate(new Date());
  const value = parseInt(option.replace('d', ''), 10);

  return {
    from: formatISO(subDays(now, value)),
    to: formatISO(now),
  };
}

type SchemaExplorerContextType = {
  isArgumentListCollapsed: boolean;
  setArgumentListCollapsed(isCollapsed: boolean): void;
  setPeriodOption(option: PeriodOption): void;
  periodOption: PeriodOption;
  availablePeriodOptions: PeriodOption[];
  period: Period;
};

const SchemaExplorerContext = createContext<SchemaExplorerContextType>({
  isArgumentListCollapsed: true,
  setArgumentListCollapsed: () => {},
  periodOption: '7d',
  period: createPeriod('7d'),
  availablePeriodOptions: ['7d'],
  setPeriodOption: () => {},
});

export function SchemaExplorerProvider({
  dataRetentionInDays,
  children,
}: {
  dataRetentionInDays: number;
  children: ReactNode;
}): ReactElement {
  const [isArgumentListCollapsed, setArgumentListCollapsed] = useLocalStorage(
    'hive:schema-explorer:collapsed',
    true,
  );
  const [periodOption, setPeriodOption] = useLocalStorage<PeriodOption>(
    'hive:schema-explorer:period',
    '30d',
  );
  const [period, setPeriod] = useState(createPeriod(periodOption));

  useEffect(() => {
    const inDays = parseInt(periodOption.replace('d', ''), 10);
    if (dataRetentionInDays < inDays) {
      updatePeriod(dataRetentionInDays > 7 ? '30d' : '7d');
    }
  }, [periodOption, setPeriodOption]);

  const updatePeriod = useCallback<SchemaExplorerContextType['setPeriodOption']>(
    option => {
      setPeriodOption(option);
      setPeriod(createPeriod(option));
    },
    [setPeriodOption, setPeriod],
  );

  const availablePeriodOptions = useMemo(() => {
    const options = Object.keys(periodLabelMap) as PeriodOption[];

    return options.filter(option => parseInt(option.replace('d', ''), 10) <= dataRetentionInDays);
  }, [periodOption]);

  return (
    <SchemaExplorerContext.Provider
      value={{
        isArgumentListCollapsed,
        setArgumentListCollapsed,
        period,
        setPeriodOption: updatePeriod,
        periodOption,
        availablePeriodOptions,
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

const periodLabelMap: {
  [key in PeriodOption]: string;
} = {
  '365d': 'Last year',
  '180d': 'Last 6 months',
  '90d': 'Last 3 months',
  '30d': 'Last 30 days',
  '14d': 'Last 14 days',
  '7d': 'Last 7 days',
};

export function usePeriodSelector() {
  const { availablePeriodOptions, setPeriodOption, periodOption } = useSchemaExplorerContext();
  return {
    options: availablePeriodOptions.map(option => ({
      label: periodLabelMap[option],
      value: option,
    })),
    onChange: setPeriodOption,
    value: periodOption,
  };
}
