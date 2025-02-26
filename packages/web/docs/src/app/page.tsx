import { ReactElement } from 'react';
import { Metadata } from 'next';
import {
  Anchor,
  ArchDecoration,
  CallToAction,
  cn,
  DecorationIsolation,
  GetYourAPIGameRightSection,
  Heading,
  HighlightDecoration,
  InfoCard,
  LargeHiveIconDecoration,
  ToolsAndLibrariesCards,
} from '@theguild/components';
import { CheckIcon } from '../components/check-icon';
import { CommunitySection } from '../components/community-section';
import { CompanyTestimonialsSection } from '../components/company-testimonials';
import { EcosystemManagementSection } from '../components/ecosystem-management';
import { FrequentlyAskedQuestions } from '../components/frequently-asked-questions';
import { Hero, HeroFeatures, HeroLinks } from '../components/hero';
import { LandingPageContainer } from '../components/landing-page-container';
import { LandingPageFeatureTabs } from '../components/landing-page-feature-tabs';
import { StatsItem, StatsList } from '../components/stats';
import { TeamSection } from '../components/team-section';
import { TrustedBySection } from '../components/trusted-by-section';
import { metadata as rootMetadata } from './layout';

export const metadata: Metadata = {
  title: 'Open-Source GraphQL Federation Platform',
  description:
    'Fully Open-Source schema registry, analytics and gateway for GraphQL federation and other GraphQL APIs',
  alternates: {
    // to remove leading slash
    canonical: '.',
  },
  openGraph: rootMetadata.openGraph,
};

export default function IndexPage(): ReactElement {
  return (
    <LandingPageContainer className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
      <Hero className="mx-4 max-sm:mt-2 md:mx-6">
        <Heading
          as="h1"
          size="xl"
          className="mx-auto max-w-3xl text-balance text-center text-white"
        >
          Open-Source GraphQL Federation Platform
        </Heading>
        <p className="mx-auto w-[512px] max-w-[80%] text-center leading-6 text-white/80">
          Fully open-source schema registry, analytics, metrics and{' '}
          <Anchor
            href="/gateway"
            title="Learn more about Hive Gateway"
            className="underline decoration-white/30 underline-offset-2 hover:decoration-white/80"
          >
            gateway
          </Anchor>{' '}
          for{' '}
          <Anchor
            href="/federation"
            title="Visit our guide to learn more about GraphQL federation"
            className="underline decoration-white/30 underline-offset-2 hover:decoration-white/80"
          >
            GraphQL federation
          </Anchor>{' '}
          and other GraphQL APIs.
        </p>
        <HeroFeatures>
          <li>
            <CheckIcon className="text-blue-400" />
            MIT licensed
          </li>
          <li>
            <CheckIcon className="text-blue-400" />
            No vendor-lock
          </li>
          <li>
            <CheckIcon className="text-blue-400" />
            Managed and self-hosted
          </li>
        </HeroFeatures>
        <HeroLinks>
          <CallToAction variant="primary-inverted" href="https://app.graphql-hive.com">
            Get started for free
          </CallToAction>
          <CallToAction variant="secondary" href="/docs">
            Documentation
          </CallToAction>
        </HeroLinks>
      </Hero>
      <LandingPageFeatureTabs className="relative mt-6 sm:mt-[-72px]" />
      <TrustedBySection className="mx-auto my-8 md:my-16 lg:my-24" />
      <EcosystemManagementSection className="mx-4 md:mx-6" />
      <StatsList className="mt-6 md:mt-0">
        <StatsItem label="GitHub commits" value={6.2} suffix="K" decimal />
        <StatsItem label="Active developers" value={6.2} suffix="K" decimal />
        <StatsItem label="Registered schemas" value={270} suffix="K" />
        <StatsItem label="Collected operations" value={350} suffix="B" />
      </StatsList>
      <UltimatePerformanceCards />
      <LearnGraphQLFederationSection className="mx-4 md:mx-6" />
      <CompanyTestimonialsSection className="mx-4 mt-6 md:mx-6" />
      <GetStartedTodaySection className="mx-4 mt-6 md:mx-6" />
      <EnterpriseFocusedCards className="mx-4 my-6 md:mx-6" />
      <TeamSection className="mx-4 md:mx-6" />
      <CommunitySection className="mx-4 mt-6 md:mx-6" />
      <ToolsAndLibrariesCards isHive className="mx-4 mt-6 md:mx-6" />
      <FrequentlyAskedQuestions className="mx-4 md:mx-6" />
      <GetYourAPIGameRightSection className="mx-4 sm:mb-6 md:mx-6" />
    </LandingPageContainer>
  );
}

function GetStartedTodaySection({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'bg-blueish-green relative overflow-hidden rounded-3xl p-12 text-center sm:p-24',
        className,
      )}
    >
      <DecorationIsolation>
        <ArchDecoration className="absolute -left-1/2 -top-1/2 rotate-180 sm:-left-1/4 md:left-[-105px] md:top-[-109px] [&>path]:fill-none" />
        <HighlightDecoration className="absolute -left-1 -top-16 size-[600px] -scale-x-100 overflow-visible" />
        <LargeHiveIconDecoration className="absolute bottom-0 right-8 hidden lg:block" />
      </DecorationIsolation>
      <Heading as="h3" size="md" className="text-white">
        Get Started Today!
      </Heading>
      <p className="relative mt-4 text-white/80">
        Start with a free Hobby plan that fits perfectly most side projects or try our Pro plan with
        30&nbsp;days trial period.
      </p>
      <CallToAction
        variant="primary-inverted"
        className="mx-auto mt-8"
        href="https://app.graphql-hive.com/"
      >
        Enter Hive
      </CallToAction>
    </section>
  );
}

function EnterpriseFocusedCards({ className }: { className?: string }) {
  return (
    <section className={cn('px-4 py-6 sm:py-12 md:px-6 lg:py-16 xl:px-[120px]', className)}>
      <Heading as="h2" size="md" className="text-balance sm:px-6 sm:text-center">
        Enterprise-Focused Tools Tailored for You
      </Heading>
      <ul className="mt-6 flex flex-row flex-wrap justify-center gap-2 md:mt-16 md:gap-6">
        <InfoCard
          as="li"
          heading="Cloud and Self-Hosted"
          icon={<PerformanceListItemIcon />}
          className="flex-1 rounded-2xl md:rounded-3xl"
        >
          Hive is completely open source, MIT licensed. You can host it on your own infrastructure.
        </InfoCard>
        <InfoCard
          as="li"
          heading="Single Sign-On"
          icon={<PerformanceListItemIcon />}
          className="flex-1 basis-full rounded-2xl md:basis-0 md:rounded-3xl"
        >
          Integrated with popular providers like Okta, to enable OpenID Connect login for maximum
          security.
        </InfoCard>
        <InfoCard
          as="li"
          heading="RBAC"
          icon={<PerformanceListItemIcon />}
          className="flex-1 basis-full rounded-2xl md:rounded-3xl lg:basis-0"
        >
          Control user access with detailed, role-based permissions for enhanced security and
          flexibility.
        </InfoCard>
      </ul>
    </section>
  );
}

function UltimatePerformanceCards() {
  return (
    <section className="px-4 py-6 sm:py-12 md:px-6 xl:px-[120px]">
      <Heading as="h2" size="md" className="text-balance text-center">
        GraphQL Federation for the Ultimate Performance
      </Heading>
      <ul className="mt-6 flex flex-row flex-wrap justify-center gap-2 md:mt-16 md:gap-6">
        <InfoCard
          as="li"
          heading="Team Autonomy"
          icon={<PerformanceListItemIcon />}
          className="flex-1 rounded-2xl md:rounded-3xl"
        >
          Perfect for domain-driven design, allowing teams to work contribute individual graphs in
          any language to a cohesive GraphQL API.
        </InfoCard>
        <InfoCard
          as="li"
          heading="Scalability"
          icon={<PerformanceListItemIcon />}
          className="flex-1 basis-full rounded-2xl md:basis-0 md:rounded-3xl"
        >
          Individual graphs can be scaled independently based on their specific requirements.
        </InfoCard>
        <InfoCard
          as="li"
          heading="Unified API"
          icon={<PerformanceListItemIcon />}
          className="flex-1 basis-full rounded-2xl md:rounded-3xl lg:basis-0"
        >
          Clients get a seamless, unified experience. The complexity is hidden behind a single
          endpoint.
        </InfoCard>
      </ul>
    </section>
  );
}

function LearnGraphQLFederationSection(props: { className?: string }) {
  return (
    <section
      className={cn(
        'to-green-1000 from-blueish-green relative rounded-3xl bg-gradient-to-br p-8 sm:py-12 md:px-6 md:text-center lg:p-24',
        props.className,
      )}
    >
      <DecorationIsolation className="opacity-80">
        <ArchDecoration className="absolute -right-1/2 top-1/2 sm:-right-1/4 md:right-[-105px] md:top-[120px] [&>path]:fill-none [&>path]:stroke-white/30" />
        <HighlightDecoration className="absolute -bottom-16 -right-1 size-[600px] rotate-180 -scale-x-100 overflow-visible" />
      </DecorationIsolation>
      <Heading
        as="h2"
        size="md"
        className="flex items-center justify-center gap-4 text-pretty text-white"
      >
        What Is GraphQL Federation?
      </Heading>

      <p className="mt-4 text-pretty font-medium text-white/80">
        Understand what federated GraphQL API is, how it works, and why it may be the right choice
        for your API.
      </p>
      <CallToAction
        variant="secondary"
        href="/federation"
        className="mx-auto mt-6 md:mt-8"
        title="Introduction to federated GraphQL APIs"
      >
        Introduction to Federation
      </CallToAction>
    </section>
  );
}

function PerformanceListItemIcon() {
  return (
    <svg width="24" height="24" fill="currentColor">
      <path d="M5.25 7.5a2.25 2.25 0 1 1 3 2.122v4.756a2.251 2.251 0 1 1-1.5 0V9.622A2.25 2.25 0 0 1 5.25 7.5Zm9.22-2.03a.75.75 0 0 1 1.06 0l.97.97.97-.97a.75.75 0 1 1 1.06 1.06l-.97.97.97.97a.75.75 0 0 1-1.06 1.06l-.97-.97-.97.97a.75.75 0 1 1-1.06-1.06l.97-.97-.97-.97a.75.75 0 0 1 0-1.06Zm2.03 5.03a.75.75 0 0 1 .75.75v3.128a2.251 2.251 0 1 1-1.5 0V11.25a.75.75 0 0 1 .75-.75Z" />
    </svg>
  );
}
