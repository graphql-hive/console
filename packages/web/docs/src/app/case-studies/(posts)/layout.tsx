import { GetYourAPIGameWhite } from '#components/get-your-api-game-white';
import { cn } from '@theguild/components';
import { CaseStudiesHeader } from '../case-studies-header';
import { MoreStoriesSection } from '../more-stories-section';
import '../case-studies-styles.css';
import { LookingToUseHiveUpsellBlock } from '../looking-to-use-hive-upsell-block';

// We can't use CSS Modules together with Tailwind,
// because the class responsible for dark mode gets transformed
// so `dark:` prefixes don't work.
const ONE_OFF_CLASS_CASE_STUDIES = 'case-studies';
const MAIN_CONTENT = 'main-content';

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(ONE_OFF_CLASS_CASE_STUDIES, 'mx-auto box-content max-w-[90rem]')}>
      <CaseStudiesHeader className="mx-auto max-w-[--nextra-content-width] pl-6 sm:my-12 md:pl-12 lg:my-24" />
      <div className={cn(MAIN_CONTENT, 'mx-auto flex')}>
        {children}
        <LookingToUseHiveUpsellBlock className="sticky right-2 top-[108px] mb-8 h-min max-lg:hidden lg:w-[320px] xl:w-[400px]" />
      </div>
      <MoreStoriesSection />
      <GetYourAPIGameWhite className="sm:my-24" />
    </div>
  );
}
