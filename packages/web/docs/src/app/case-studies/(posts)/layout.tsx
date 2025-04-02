import { GetYourAPIGameWhite } from '#components/get-your-api-game-white';
import { cn, HiveLayoutConfig } from '@theguild/components';
import { CaseStudiesHeader } from '../case-studies-header';
import { MoreStoriesSection } from '../more-stories-section';
import '../../hive-prose-styles.css';
import { LookingToUseHiveUpsellBlock } from '../looking-to-use-hive-upsell-block';

// We can't use CSS Modules together with Tailwind,
// because the class responsible for dark mode gets transformed
// so `dark:` prefixes don't work.
const MAIN_CONTENT = 'main-content';

export default function CaseStudiesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hive-prose mx-auto box-content max-w-[90rem]">
      <HiveLayoutConfig widths="landing-narrow" />
      <CaseStudiesHeader className="mx-auto max-w-[--nextra-content-width] pl-6 sm:my-12 md:pl-12 lg:my-24" />
      <div className={cn(MAIN_CONTENT, 'mx-auto flex [&>div:first-of-type>:first-child]:hidden')}>
        {children}
        <LookingToUseHiveUpsellBlock className="sticky right-2 top-[108px] mb-8 h-min max-lg:hidden lg:w-[320px] xl:w-[400px]" />
      </div>
      <MoreStoriesSection className="mx-4 md:mx-6" />
      <GetYourAPIGameWhite className="sm:my-24" />
    </div>
  );
}
