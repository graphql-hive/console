import type { ReactNode } from 'react';
import { Filters } from '@/components/base/floating/filter-menu/filters';
import { SchemaVariantFilter } from './filter';
import {
  useExplorerFilterDimensions,
  type ExplorerFilterDimensionsOptions,
} from './use-explorer-filter-dimensions';

/**
 * The filter row shared by all four explorer views, sitting directly under the
 * page lead. The All / Unused / Deprecated tabs stay a control of their own on
 * the right rather than folding into the menu, since they switch view rather
 * than narrow one.
 */
export function ExplorerFilterBar({
  variant,
  dateRangeControl,
  ...dimensionOptions
}: ExplorerFilterDimensionsOptions & {
  variant: 'all' | 'unused' | 'deprecated';
  /**
   * Passed in rather than built here: the All and Type views drive the picker
   * off the provider's period, while Unused and Deprecated own a local
   * controller.
   */
  dateRangeControl: ReactNode;
}) {
  const dimensions = useExplorerFilterDimensions(dimensionOptions);

  return (
    <div className="flex items-center justify-between gap-4">
      <Filters dimensions={dimensions} pinnedControls={dateRangeControl} />
      <SchemaVariantFilter
        organizationSlug={dimensionOptions.organizationSlug}
        projectSlug={dimensionOptions.projectSlug}
        targetSlug={dimensionOptions.targetSlug}
        variant={variant}
      />
    </div>
  );
}
