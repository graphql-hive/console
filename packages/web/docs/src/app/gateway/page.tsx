import { Metadata } from 'next';
import {
  CallToAction,
  ExploreMainProductCards,
  FrequentlyAskedQuestions,
  Hero,
  HeroLogo,
  HiveGatewayIcon,
} from '@theguild/components';
import { ErrorBoundary } from '../../components/error-boundary';
import { GetYourAPIGameRightList } from '../../components/get-your-api-game-right-list';
import { LandingPageContainer } from '../../components/landing-page-container';
import { metadata as rootMetadata } from '../layout';
import { CloudNativeSection } from './cloud-native-section';
import { FederationCompatibleBenchmarksSection } from './federation-compatible-benchmarks';
import { GatewayFeatureTabs } from './gateway-feature-tabs';
import { GatewayHeroDecoration } from './gateway-hero-decoration';
import GatewayLandingFAQ from './gateway-landing-faq.mdx';
import { LetsGetAdvancedSection } from './lets-get-advanced-section';
import { OrchestrateYourWay } from './orchestrate-your-way';

export const metadata: Metadata = {
  title: 'Hive Gateway',
  description:
    'Unify and accelerate your data graph with Hive Gateway, which seamlessly integrates with Apollo Federation.',
  openGraph: {
    ...rootMetadata.openGraph,
    url: '/gateway',
  },
};

export default function HiveGatewayPage() {
  return (
    <LandingPageContainer className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
      <Hero
        top={
          <HeroLogo>
            <HiveGatewayIcon />
          </HeroLogo>
        }
        heading="Hive Gateway"
        text="Unify and accelerate your data graph across diverse services with Hive Gateway, which seamlessly integrates with Apollo Federation."
        checkmarks={['Fully open source', 'No vendor lock-in', 'Can be self-hosted!']}
        // todo: when the feature cards section get rewritten to the new design, remove these bottom paddings
        className="mx-4 sm:!pb-28 md:mx-6 lg:!pb-[168px]"
      >
        <CallToAction variant="primary-inverted" href="/docs/gateway">
          Get Started
        </CallToAction>
        <CallToAction variant="secondary-inverted" href="https://github.com/graphql-hive/gateway">
          GitHub
        </CallToAction>
        <GatewayHeroDecoration>
          <defs>
            <linearGradient id="gateway-hero-gradient" gradientTransform="rotate(139)">
              <stop offset="11.66%" stopColor="rgba(255, 255, 255, 0.1)" />
              <stop offset="74.87%" stopColor="rgba(255, 255, 255, 0.3)" />
            </linearGradient>
            <linearGradient
              id="gateway-hero-gradient-mobile"
              x1="35.3488"
              y1="15.0697"
              x2="224.372"
              y2="229.023"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor="white" stopOpacity="0.2" />
              <stop offset="80%" stopColor="white" />
            </linearGradient>
          </defs>
        </GatewayHeroDecoration>
      </Hero>
      <GatewayFeatureTabs className="relative mt-6 sm:mt-[-72px] sm:bg-blue-100" />
      <OrchestrateYourWay className="mx-4 mt-6 sm:mx-8" />
      <ErrorBoundary
        fallback={
          // this section doesn't make sense if data didn't load, so we just unmount
          null
        }
      >
        <FederationCompatibleBenchmarksSection />
      </ErrorBoundary>
      <LetsGetAdvancedSection />
      <CloudNativeSection className="mx-4 mt-6 md:mx-6" />
      <ExploreMainProductCards className="max-lg:mx-4 max-lg:my-8" />
      <FrequentlyAskedQuestions
        /* todo: I'm pretty sure this prop is redundant, but okay */
        faqPages={['/gateway']}
      >
        <GatewayLandingFAQ />
      </FrequentlyAskedQuestions>
      <GetYourAPIGameRightList className="mx-4 sm:mb-6 md:mx-6" />
    </LandingPageContainer>
  );
}
