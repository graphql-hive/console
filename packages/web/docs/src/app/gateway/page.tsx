import { Metadata } from 'next';
import {
  CallToAction,
  DecorationIsolation,
  ExploreMainProductCards,
  Hero,
  HeroLogo,
  HiveGatewayIcon,
} from '@theguild/components';
import { LandingPageContainer } from '../../components/landing-page-container';
import { metadata as rootMetadata } from '../layout';
import { GatewayFeatureTabs } from './gateway-feature-tabs';
import { OrchestrateYourWay } from './orchestrate-your-way';

export const metadata: Metadata = {
  title: 'Hive Gateway',
  description:
    'Unify and accelerate your data graph with Hive Gateway, which seamlessly integrates with Apollo Federation.',
  alternates: {
    // to remove leading slash
    canonical: '.',
  },
  openGraph: {
    ...rootMetadata.openGraph,
    // to remove leading slash
    url: '.',
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
        <GatewayHeroDecoration />
      </Hero>
      <GatewayFeatureTabs className="relative mt-6 bg-blue-100 sm:mt-[-72px]" />
      <OrchestrateYourWay />
      {/* Federation-Compatible Gateway Benchmarks */}
      {/* Let's get advanced */}
      {/* Cloud-Native Nature */}
      <ExploreMainProductCards className="max-lg:mx-4 max-lg:my-8" />
      {/* big get your API game right section */}
    </LandingPageContainer>
  );
}

function GatewayHeroDecoration() {
  return (
    <DecorationIsolation className="-z-10">
      <HiveGatewayIcon className="absolute left-[-268px] top-[-8px] size-[520px] fill-[url(#gateway-hero-gradient)] max-lg:hidden" />
      <HiveGatewayIcon className="absolute right-[-144px] top-[-64px] size-[320px] fill-[url(#gateway-hero-gradient-mobile)] md:bottom-[-64px] md:right-[-268px] md:top-auto md:size-[520px] md:fill-[url(#gateway-hero-gradient)] lg:bottom-[-8px]" />
      <svg
        className="pointer-events-none -z-50 size-0"
        width="192"
        height="296"
        viewBox="0 0 192 296"
      >
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
      </svg>
    </DecorationIsolation>
  );
}
