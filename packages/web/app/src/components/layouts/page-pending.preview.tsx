import { createPreview, type NavPath } from 'react-foundry';
import { PagePending, SectionPending } from './page-pending';

export const nav: NavPath = 'Components/PagePending';

export const Page = createPreview(() => (
  <div className="w-[56rem]">
    <PagePending />
  </div>
));

// Beside a versions list, where the history index waits to redirect.
export const Section = createPreview(() => (
  <div className="flex w-[56rem] gap-8">
    <div className="text-fg-secondary flex w-48 flex-col gap-3 text-sm">
      <span className="text-fg-default">rev-a1b2c3</span>
      <span>rev-b2c3d4</span>
      <span>rev-c3d4e5</span>
    </div>
    <SectionPending />
  </div>
));
