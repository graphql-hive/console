import { createPreview, type NavPath } from 'react-foundry';
import { PageSkeleton, SectionSkeleton } from './page-skeleton';

export const nav: NavPath = 'Components/PageSkeleton';

export const Page = createPreview(() => <PageSkeleton />);

// Beside a settings nav, where a section route's pending state renders.
export const Section = createPreview(() => (
  <div className="flex w-[56rem] gap-8">
    <div className="text-neutral-10 flex w-48 flex-col gap-3 text-sm">
      <span className="text-neutral-12">General</span>
      <span>CDN tokens</span>
      <span>Registry tokens</span>
    </div>
    <div className="grow">
      <SectionSkeleton />
    </div>
  </div>
));
