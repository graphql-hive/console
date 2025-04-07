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
import { ComparisonTable } from './comparison-table';

// TODO: [comparison].tsx - statically generate based on json tables

const description =
  'See why teams choose a fully open-source gateway instead of other closed solutions';

const logos = {
  apollo: (
    <svg xmlns="http://www.w3.org/2000/svg" width="49" height="48" viewBox="0 0 49 48" fill="none">
      <g clip-path="url(#clip0_2034_3858)">
        <path
          d="M34.8494 30.5932L33.7544 27.4822L32.3128 23.3854L31.2699 20.4209L29.9046 16.5411L28.3185 12.0344H20.6262L19.3979 15.5241L18.3033 18.635L12.8662 34.0861H17.9399L19.5316 29.5762H27.2252L25.8603 25.6964H20.8908L21.9337 22.7315L24.1122 16.5407L24.4724 15.5163L24.8322 16.5411L31.0032 34.0828L31.0049 34.0861H36.0785L34.8494 30.5932Z"
          fill="#245850"
        />
        <path
          d="M45.3858 12.224C45.2581 11.998 45.046 11.8319 44.796 11.7622C44.546 11.6925 44.2786 11.7249 44.0524 11.8523C43.9404 11.9154 43.842 12 43.7627 12.1012C43.6834 12.2023 43.6249 12.3182 43.5904 12.442C43.5559 12.5658 43.5462 12.6952 43.5618 12.8228C43.5773 12.9504 43.6179 13.0737 43.6812 13.1856C45.6184 16.6299 46.5933 20.5319 46.5037 24.4826C46.414 28.4332 45.2631 32.287 43.1716 35.6399C41.0801 38.9927 38.125 41.721 34.6163 43.5388C31.1075 45.3567 27.1743 46.197 23.2291 45.9717C17.9447 45.6691 12.9461 43.4737 9.14796 39.7873C5.34981 36.1009 3.00615 31.1701 2.54589 25.8971C2.08564 20.6242 3.53957 15.3619 6.64161 11.0732C9.74364 6.78453 14.2863 3.75631 19.4383 2.54276C24.5911 1.33053 30.0081 2.01414 34.6982 4.4685C34.548 5.16033 34.6477 5.883 34.9796 6.5083C35.3117 7.13368 35.8546 7.62119 36.5119 7.8843C37.1692 8.14711 37.8984 8.16859 38.57 7.94494C39.2416 7.72129 39.8123 7.26696 40.1809 6.66255C40.5494 6.05801 40.6918 5.34245 40.5829 4.64286C40.4738 3.94339 40.1204 3.30519 39.5854 2.84151C39.0504 2.37782 38.3685 2.11864 37.6606 2.10994C36.9527 2.10131 36.2646 2.34376 35.7185 2.79425C30.6209 0.0914258 24.7198 -0.683104 19.0975 0.612699C13.4751 1.9085 8.50827 5.18777 5.10794 9.84912C1.70762 14.5105 0.101703 20.2414 0.584711 25.9909C1.06772 31.7405 3.60727 37.1231 7.73764 41.1519C11.868 45.1806 17.3123 47.5852 23.0721 47.9248C28.8318 48.2644 34.521 46.5162 39.0962 43.0008C43.6714 39.4854 46.8259 34.4384 47.9812 28.7855C49.1365 23.1326 48.2152 17.2526 45.3862 12.224"
          fill="#245850"
        />
      </g>
      <defs>
        <clipPath id="clip0_2034_3858">
          <rect width="48" height="48" fill="white" transform="translate(0.5)" />
        </clipPath>
      </defs>
    </svg>
  ),
};

export const metadata: Metadata = {
  title: 'Hive Gateway vs. Apollo Router',
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
        heading={`Hive Gateway vs. ${comparison.name}`}
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
      <ComparisonTable
        columns={[
          {
            name: 'Apollo Router',
            icon: logos.apollo,
          },
          {
            name: 'Hive Gateway',
            icon: <HiveGatewayIcon className="text-green-800" />,
          },
        ]}
        sections={[
          {
            title: 'Features Set 1',
            description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            rows: [
              { feature: 'Feature 1', values: [false, true] },
              { feature: 'Feature 2', values: [false, true] },
              { feature: 'Feature 3', values: [false, true] },
              { feature: 'Feature 4', values: [true, false] },
              { feature: 'Feature ...', values: [true, false] },
            ],
          },
        ]}
      />
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
