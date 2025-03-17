import {
  ArchDecoration,
  cn,
  DecorationIsolation,
  GetYourAPIGameRightSection,
  Heading,
  HiveLayoutConfig,
} from '@theguild/components';
import { LandingPageContainer } from '../../components/landing-page-container';
import { CompanyNewsAndPressSection } from './company-news-and-press-section';

export const metadata = {
  title: 'Hive Blog',
};

export default function BlogPage() {
  return (
    <LandingPageContainer className="mx-auto max-w-[90rem] overflow-hidden px-6">
      <HiveLayoutConfig widths="landing-narrow" />
      <BlogPageHero className="mx-4 max-sm:mt-2 md:mx-6" />
      <CompanyNewsAndPressSection className="mx-4 md:mx-6" />
      <GetYourAPIGameRightSection className="text-green-1000 mx-4 sm:mb-6 md:mx-6" />
    </LandingPageContainer>
  );
}

function BlogPageHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-beige-200 relative isolate flex max-w-[90rem] flex-col gap-6 overflow-hidden rounded-3xl px-4 py-6 sm:py-12 md:gap-8 lg:py-24',
        className,
      )}
    >
      <DecorationIsolation>
        <ArchDecoration className="pointer-events-none absolute left-[-46px] top-[-20px] size-[200px] rotate-180 md:left-[-60px] md:top-[-188px] md:size-auto" />
        <ArchDecoration className="pointer-events-none absolute bottom-0 right-[-53px] size-[200px] md:-bottom-32 md:size-auto lg:bottom-[-188px] lg:right-0" />
        <svg width="432" height="432" viewBox="0 0 432 432" className="absolute -z-10">
          <defs>
            <linearGradient
              id="arch-decoration-a"
              x1="48.5"
              y1="53.5"
              x2="302.5"
              y2="341"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" stopOpacity="0.3" />
              <stop offset="1" stopColor="#fff" stopOpacity="1" />
            </linearGradient>
            <linearGradient
              id="arch-decoration-b"
              x1="1"
              y1="1"
              x2="431"
              y2="431"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="#fff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0.4" />
            </linearGradient>
          </defs>
        </svg>
      </DecorationIsolation>
      <Heading as="h1" size="xl" className="text-green-1000 z-0 mx-auto max-w-3xl text-center">
        GraphQL Stories
      </Heading>
      <p className="z-0 mx-auto max-w-[80%] text-center leading-6 text-green-800">
        Explore insights on managing and optimizing your GraphQL APIs
      </p>
    </div>
  );
}
