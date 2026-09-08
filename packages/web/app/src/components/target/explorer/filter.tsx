import { useCallback } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button as BaseButton } from '@/components/base/button/button';
import {
  availablePresets,
  DateRangePicker,
  getDateRangeDisplayLabel,
} from '@/components/ui/date-range-picker';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Link,
  RegisteredRouter,
  RoutePaths,
  ToPathOption,
  useLocation,
} from '@tanstack/react-router';
import { usePeriodSelector } from './provider';

export function DateRangeFilter() {
  const periodSelector = usePeriodSelector();
  const validUnits = ['y', 'M', 'w', 'd'] as const;
  const onUpdate = useCallback(
    (value: { preset: { range: { from: string; to: string } } }) => {
      periodSelector.setPeriod(value.preset.range);
    },
    [periodSelector],
  );

  return (
    <DateRangePicker
      trigger={
        <BaseButton
          label={getDateRangeDisplayLabel(periodSelector.period, availablePresets, [...validUnits])}
          variant="default"
          rightIcon={{ icon: ChevronDown, withSeparator: true }}
        />
      }
      validUnits={[...validUnits]}
      onUpdate={onUpdate}
      selectedRange={periodSelector.period}
      startDate={periodSelector.startDate}
      align="start"
    />
  );
}

const variants: Array<{
  value: 'all' | 'unused' | 'deprecated';
  label: string;
  pathname: ToPathOption<RegisteredRouter, RoutePaths<RegisteredRouter['routeTree']>, ''>;
  tooltip: string;
}> = [
  {
    value: 'all',
    label: 'All',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer',
    tooltip: 'Shows all types, including unused and deprecated ones',
  },
  {
    value: 'unused',
    label: 'Unused',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer/unused',
    tooltip: 'Shows only types that are not used in any operation',
  },
  {
    value: 'deprecated',
    label: 'Deprecated',
    pathname: '/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated',
    tooltip: 'Shows only types that are marked as deprecated',
  },
];

export function SchemaVariantFilter(props: {
  organizationSlug: string;
  projectSlug: string;
  targetSlug: string;
  variant: 'all' | 'unused' | 'deprecated';
}) {
  const { search } = useLocation();
  return (
    <TooltipProvider>
      <Tabs defaultValue={props.variant}>
        <TabsList className="dark:bg-neutral-3 bg-neutral-5">
          {variants.map(variant => (
            <Tooltip key={variant.value}>
              <TooltipTrigger asChild>
                {props.variant === variant.value ? (
                  <div>
                    <TabsTrigger
                      className="dark:data-[state=active]:bg-neutral-5 data-[state=active]:bg-neutral-6 data-[state=active]:text-neutral-12"
                      value={variant.value}
                    >
                      {variant.label}
                    </TabsTrigger>
                  </div>
                ) : (
                  <TabsTrigger
                    className="text-neutral-9 hover:text-neutral-11"
                    value={variant.value}
                    asChild
                  >
                    <Link
                      to={variant.pathname}
                      params={{
                        organizationSlug: props.organizationSlug,
                        projectSlug: props.projectSlug,
                        targetSlug: props.targetSlug,
                      }}
                      search={search}
                    >
                      {variant.label}
                    </Link>
                  </TabsTrigger>
                )}
              </TooltipTrigger>
              <TooltipContent side="bottom">{variant.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>
    </TooltipProvider>
  );
}
