import {
  ArchDecoration,
  cn,
  DecorationIsolation,
  GetYourAPIGameRightSection,
  Heading,
} from '@theguild/components';
import { CompanyTestimonialsSection } from './company-testimonials';
import { FrequentlyAskedQuestions } from './frequently-asked-questions';
import { Page } from './page';
import { PlanComparison } from './plan-comparison';
import { Pricing } from './pricing';

export function PricingPage() {
  return (
    <Page className="text-green-1000 light mx-auto max-w-[90rem] overflow-hidden">
      <PricingPageHero className="mx-4 max-sm:mt-2 md:mx-6" />

      <Pricing className="mt-4" />

      <PlanComparison className="mx-4 md:mx-6" />

      <CompanyTestimonialsSection className="mx-4 mt-6 md:mx-6" />

      {/* TODO: Pricing specific questions in the future? */}
      <FrequentlyAskedQuestions className="mx-4 md:mx-6" />

      <GetYourAPIGameRightSection className="mx-4 sm:mb-6 md:mx-6" />
    </Page>
  );
}

function PricingPageHero({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'bg-beige-100 relative isolate flex max-w-[90rem] flex-col gap-6 overflow-hidden rounded-3xl px-4 py-6 sm:py-12 md:gap-8 lg:py-24',
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
        Honest pricing plans for your API management
      </Heading>
      <p className="z-0 mx-auto max-w-[80%] text-center leading-6 text-green-800">
        From hobbyists to enterprises — enjoy all features and usage-based pricing.
      </p>
    </div>
  );
}
