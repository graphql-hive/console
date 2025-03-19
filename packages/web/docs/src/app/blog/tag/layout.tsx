import { GetYourAPIGameRightSection, HiveLayoutConfig } from '@theguild/components';
import { LandingPageContainer } from '../../../components/landing-page-container';
import { BlogPageHero } from '../components/blog-page-hero';
import { CompanyNewsAndPressSection } from '../components/company-news-and-press-section';

export default function BlogPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <LandingPageContainer className="text-green-1000 mx-auto max-w-[90rem] overflow-hidden dark:text-white">
      <HiveLayoutConfig widths="landing-narrow" />
      <BlogPageHero className="mx-4 max-sm:mt-2 md:mx-6" />
      {children}
      <CompanyNewsAndPressSection className="mx-4 md:mx-6" />
      <GetYourAPIGameRightSection className="light text-green-1000 dark:bg-primary/95 mx-4 sm:mb-6 md:mx-6" />
    </LandingPageContainer>
  );
}
