import { ReactElement } from 'react';
import { Metadata } from 'next';
import {
  CallToAction,
  GetYourAPIGameRightSection,
  Hero,
  HeroLogo,
  HiveGatewayIcon,
} from '@theguild/components';
import { CommunitySection } from '../../../components/community-section';
import { CompanyTestimonialsSection } from '../../../components/company-testimonials';
import { ErrorBoundary } from '../../../components/error-boundary';
import { LandingPageContainer } from '../../../components/landing-page-container';
import { TrustedBySection } from '../../../components/trusted-by-section';
import { metadata as rootMetadata } from '../../layout';
import { FederationCompatibleBenchmarksSection } from '../federation-compatible-benchmarks';
import { GatewayHeroDecoration } from '../gateway-hero-decoration';

// TODO: [comparison].tsx - statically generate based on json tables

const description =
  'See why teams choose a fully open-source gateway instead of other closed solutions';

export const metadata: Metadata = {
  title: 'Hive Gateway vs Apollo Router',
  description,
  alternates: {
    // to remove leading slash
    canonical: '.',
  },
  openGraph: rootMetadata.openGraph,
};

export default function ComparisonPage(): ReactElement {
  const comparison = {
    name: 'Apollo Router',
  };

  return (
    <LandingPageContainer className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
      <Hero
        top={
          <HeroLogo>
            <HiveGatewayIcon />
          </HeroLogo>
        }
        className="bg-beige-100 mx-4 max-sm:mt-2 md:mx-6"
        heading={`Hive Gateway vs ${comparison.name}`}
        checkmarks={['Fully open source', 'No vendor lock-in', 'Can be self-hosted!']}
        text={description}
      >
        <CallToAction variant="primary-inverted" href="/docs/gateway">
          Get Started
        </CallToAction>
        <CallToAction variant="secondary-inverted" href="https://github.com/graphql-hive/gateway">
          GitHub
        </CallToAction>
        <GatewayHeroDecoration>
          <defs>
            <linearGradient
              id="gateway-hero-gradient"
              x1="-188.558"
              y1="63.4883"
              x2="118.605"
              y2="411.163"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0.5" />
              <stop offset="1" stopColor="white" />
            </linearGradient>
            <linearGradient
              id="gateway-hero-gradient-mobile"
              x1="-188.558"
              y1="63.4883"
              x2="118.605"
              y2="411.163"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0.3" />
              <stop offset="1" stopColor="white" />
            </linearGradient>
          </defs>
        </GatewayHeroDecoration>
      </Hero>
      <TrustedBySection className="mx-auto my-8 md:my-16 lg:my-24" />
      <CompanyTestimonialsSection className="mx-4 mt-6 md:mx-6" />
      <ErrorBoundary
        fallback={
          // this section doesn't make sense if data didn't load, so we just unmount
          null
        }
      >
        <FederationCompatibleBenchmarksSection />
      </ErrorBoundary>
      {/* todo: smaller Community-driven open-source section */}
      <CommunitySection className="mx-4 mt-6 md:mx-6" />
      <GetYourAPIGameRightSection className="mx-4 mt-6 sm:mb-6 md:mx-6 lg:mt-[64px]" />
    </LandingPageContainer>
  );
}
