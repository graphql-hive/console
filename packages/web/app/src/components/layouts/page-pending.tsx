import { Spinner } from '@/components/base/spinner/spinner';
import { LayoutContent } from './layout-content';

// The route is still deciding what the page is, so nothing here promises a shape.
export function PagePending() {
  return (
    <LayoutContent className="flex items-center justify-center">
      <Spinner variants={{ size: 'lg' }} />
    </LayoutContent>
  );
}

// A pane or section deciding inside a page that already rendered.
export function SectionPending() {
  return (
    <div className="flex grow items-center justify-center self-center py-24">
      <Spinner variants={{ size: 'lg' }} />
    </div>
  );
}
