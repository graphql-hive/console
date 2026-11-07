import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { LayoutContent } from './layout-content';
import { pagePendingStyles } from './page-pending.css';

// The route is still deciding what the page is, so nothing here promises a shape.
export function PagePending() {
  return (
    <LayoutContent className={pagePendingStyles.page}>
      <Spinner variants={{ size: 'lg' }} />
    </LayoutContent>
  );
}

// A pane or section deciding inside a page that already rendered.
export function SectionPending() {
  return (
    <div className={pagePendingStyles.section}>
      <Spinner variants={{ size: 'lg' }} />
    </div>
  );
}
