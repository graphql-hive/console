import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Metadata } from 'next';
import {
  CallToAction,
  GetYourAPIGameRightSection,
  Hero,
  HeroLogo,
  HiveGatewayIcon,
  NextPageProps,
} from '@theguild/components';
import { CommunitySection } from '../../../../components/community-section';
import { CompanyTestimonialsSection } from '../../../../components/company-testimonials';
import { ErrorBoundary } from '../../../../components/error-boundary';
import { LandingPageContainer } from '../../../../components/landing-page-container';
import { TrustedBySection } from '../../../../components/trusted-by-section';
import { metadata as rootMetadata } from '../../../layout';
import { FederationCompatibleBenchmarksSection } from '../../federation-compatible-benchmarks';
import { GatewayHeroDecoration } from '../../gateway-hero-decoration';
import { otherLogos } from '../../other-logos';
import { ComparisonSection, ComparisonTable } from '../comparison-table';

const DESCRIPTION =
  'See why teams choose a fully open-source gateway instead of other closed solutions';

export default async function ComparisonPage(props: NextPageProps<'comparison'>) {
  const dirname = import.meta.url.split('/').slice(2, -1).join('/');
  const file = path.join(dirname, `${(await props.params).comparison}.json`);

  const comparison = JSON.parse(
    await readFile(file, 'utf-8'),
  ) as Comparison; /* we don't really need to parse this because it's a static build */

  const Logo = otherLogos[comparison.logo as keyof typeof otherLogos];

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
        text={DESCRIPTION}
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
        // We assume Hive Gateway is always the second column.
        columns={[
          {
            name: comparison.name,
            icon: <Logo className="text-green-800" />,
          },
          {
            name: 'Hive Gateway',
            icon: <HiveGatewayIcon className="text-green-800" />,
          },
        ]}
        sections={comparison.sections}
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

export async function generateStaticParams() {
  const dirname = import.meta.url.split('/').slice(2, -1).join('/');
  const dir = await readdir(dirname);
  const jsonFiles = dir.filter(file => file.endsWith('.json'));
  return jsonFiles.map(file => ({ comparison: file.replace('.json', '') }));
}

export async function generateMetadata({ params }: NextPageProps<'comparison'>) {
  const dirname = import.meta.url.split('/').slice(2, -1).join('/');
  const file = path.join(dirname, `${(await params).comparison}.json`);

  const comparison = JSON.parse(
    await readFile(file, 'utf-8'),
  ) as Comparison; /* we don't really need to parse this because it's a static build */

  return {
    title: `Hive Gateway vs. ${comparison.name}`,
    description: DESCRIPTION,
    alternates: {
      // to remove leading slash
      canonical: '.',
    },
    openGraph: rootMetadata.openGraph,
  };
}

interface Comparison {
  name: string;
  logo: string;
  sections: ComparisonSection[];
}
