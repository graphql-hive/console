import { Metadata } from 'next';
import { CallToAction, ExploreMainProductCards, Hero, HiveGatewayIcon } from '@theguild/components';
import { LandingPageContainer } from '../../components/landing-page-container';
import { metadata as rootMetadata } from '../layout';

export const metadata: Metadata = {
  title: 'Hive Gateway',
  // TODO:
  // description:
  //   'Fully Open-Source schema registry, analytics and gateway for GraphQL federation and other GraphQL APIs',
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
        logo={<HiveGatewayIcon />}
        heading="Hive Gateway"
        text="Unify and accelerate your data graph across diverse services with Hive Gateway, which seamlessly integrates with Apollo Federation."
        checkmarks={['Fully open source', 'No vendor lock-in', 'Can be self-hosted!']}
        className="mx-4 md:mx-6"
      >
        <CallToAction variant="primary" href="/docs/gateway">
          Get Started
        </CallToAction>
        <CallToAction variant="tertiary" href="https://github.com/graphql-hive/gateway">
          GitHub
        </CallToAction>
        {/* TODO: decoration */}
      </Hero>
      <GatewayFeatureTabs />
      {/* observability and performance monitoring */}
      {/* orchestrate your way */}
      {/* Federation-Compatible Gateway Benchmarks */}
      {/* Let's get advanced */}
      {/* Cloud-Native Nature */}
      <ExploreMainProductCards className="max-lg:mx-4 max-lg:my-8" />
      {/* big get your API game right section */}
    </LandingPageContainer>
  );
}
