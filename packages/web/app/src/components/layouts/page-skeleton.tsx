import { Skeleton } from '@/components/base/skeleton/skeleton';
import { LayoutContent } from './layout-content';

/** A page while its route loads: the title block every page opens with, then its content. */
export function PageSkeleton() {
  return (
    <LayoutContent>
      <div role="status" aria-label="Loading">
        <div className="space-y-2 py-6">
          <Skeleton variants={{ size: 'xl', width: 'md' }} />
          <Skeleton variants={{ width: 'lg' }} />
        </div>
        <div className="h-64">
          <Skeleton variants={{ shape: 'block' }} />
        </div>
      </div>
    </LayoutContent>
  );
}

/** A settings section or a detail pane while it loads, inside a page that already rendered. */
export function SectionSkeleton() {
  return (
    <div role="status" aria-label="Loading" className="space-y-6">
      <div className="space-y-2">
        <Skeleton variants={{ size: 'lg', width: 'md' }} />
        <Skeleton variants={{ width: 'xl' }} />
      </div>
      <div className="h-32">
        <Skeleton variants={{ shape: 'block' }} />
      </div>
    </div>
  );
}
