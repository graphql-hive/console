import { GetYourAPIGameWhite } from '#components/get-your-api-game-white';
import { cn } from '@theguild/components';
import { CaseStudiesHeader } from '../case-studies-header';
import { MoreStoriesSection } from '../more-stories-section';
import '../case-studies-styles.css';

// We can't use CSS Modules together with Tailwind,
// because the class responsible for dark mode gets transformed
// so dark: prefixes don't work.
const ONE_OFF_CLASS_CASE_STUDIES = 'case-studies';

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(ONE_OFF_CLASS_CASE_STUDIES, 'mx-auto box-content max-w-[90rem]')}>
      <CaseStudiesHeader className="mx-auto max-w-[992px] pl-6 sm:my-12 md:pl-12 lg:my-24" />
      {children}
      <MoreStoriesSection className="sm:my-24" />
      <GetYourAPIGameWhite className="sm:my-24" />
    </div>
  );
}
