import type { ReactNode } from 'react';
import { Filters } from '@/components/base/floating/filter-menu/filters';
import { PageLead } from '@/components/base/page-lead';
import { SchemaVariantFilter } from './filter';
import {
  useExplorerFilterDimensions,
  type ExplorerFilterDimensionsOptions,
} from './use-explorer-filter-dimensions';

/**
 * The header shared by all four explorer views: the page lead paired with the
 * All / Unused / Deprecated tabs on the first row, and the filter bar beneath
 * it. The tabs sit up top because they switch view rather than narrow one, so
 * they belong with the title rather than among the filters.
 */
export function ExplorerHeader({
  title,
  description,
  variant,
  dateRangeControl,
  showFilters = true,
  ...dimensionOptions
}: ExplorerFilterDimensionsOptions & {
  title: string;
  description: string;
  variant: 'all' | 'unused' | 'deprecated';
  /**
   * Passed in rather than built here: the All and Type views drive the picker
   * off the provider's period, while Unused and Deprecated own a local
   * controller.
   */
  dateRangeControl: ReactNode;
  /** Hidden until there is a schema version to filter. */
  showFilters?: boolean;
}) {
  const dimensions = useExplorerFilterDimensions(dimensionOptions);

  return (
    <div className="py-6">
      {/* items-start keeps the tabs level with the title rather than centred
          against the lead's two lines. PageLead's own bottom margin provides
          the gap down to the filter bar. */}
      <div className="flex items-start justify-between gap-4">
        <PageLead title={title} description={description} />
        <SchemaVariantFilter
          organizationSlug={dimensionOptions.organizationSlug}
          projectSlug={dimensionOptions.projectSlug}
          targetSlug={dimensionOptions.targetSlug}
          variant={variant}
        />
      </div>
      {showFilters && <Filters dimensions={dimensions} pinnedControls={dateRangeControl} />}
    </div>
  );
}
