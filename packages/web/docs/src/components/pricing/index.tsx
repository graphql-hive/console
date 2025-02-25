'use client';

import { HTMLAttributes, ReactElement, ReactNode, useRef, useState } from 'react';
import { Arrow, Content, Root, Trigger } from '@radix-ui/react-tooltip';
import { CallToAction, cn, ContactButton, ContactTextLink, Heading } from '@theguild/components';
import { PlanCard } from './plan-card';
import { PricingSlider } from './pricing-slider';

function Tooltip({ content, children }: { content: string; children: ReactNode }) {
  return (
    <Root delayDuration={0}>
      <Trigger className="hive-focus -mx-1 -my-0.5 rounded px-1 py-0.5 text-left">
        {children}
      </Trigger>
      <Content
        sideOffset={5}
        className="bg-green-1000 z-20 rounded p-2 text-sm font-normal leading-4 text-white shadow"
      >
        {content}
        <Arrow className="fill-green-1000" />
      </Content>
    </Root>
  );
}

function PlanFeaturesListItem(props: HTMLAttributes<HTMLLIElement>) {
  return <li className="border-beige-200 py-2 [&:not(:last-child)]:border-b" {...props} />;
}

const USAGE_DATA_RETENTION_EXPLAINER = 'How long your GraphQL operations are stored on Hive';
const OPERATIONS_EXPLAINER = 'GraphQL operations reported to GraphQL Hive';

export function Pricing({ className }: { className?: string }): ReactElement {
  type PlanType = 'Hobby' | 'Pro' | 'Enterprise';

  const [highlightedPlan, setHighlightedPlan] = useState<PlanType>('Hobby');
  const scrollviewRef = useRef<HTMLDivElement>(null);

  return (
    <section className={cn('py-12 sm:py-20', className)}>
      <div className="mx-auto box-border w-full max-w-[1200px]">
        <Heading size="md" as="h3" className="max-md:text-[32px]/10 max-sm:tracking-[-.16px]">
          Operations: learn more about usage-based pricing
        </Heading>
        <p className="mt-6 text-green-800">
          Hive Console is completely free to use. We charge only for operations collected and
          processed.
        </p>

        <PricingSlider
          className="mt-6 lg:mt-12"
          onChange={value => {
            const newPlan = value === 1 ? 'Hobby' : value < 280 ? 'Pro' : 'Enterprise';
            if (newPlan !== highlightedPlan) {
              setHighlightedPlan(newPlan);
              if (!scrollviewRef.current) return;
              const card = scrollviewRef.current.querySelector(
                `[data-plan="${newPlan}"]`,
              ) as HTMLElement;
              if (!card) return;

              const isLeftSideInView = card.offsetLeft > scrollviewRef.current.scrollLeft;
              const isRightSideInView =
                card.offsetLeft + card.offsetWidth <
                scrollviewRef.current.scrollLeft + scrollviewRef.current.offsetWidth;

              console.log({
                isLeftSideInView,
                isRightSideInView,
                offsetLeft: card.offsetLeft,
                offsetWidth: card.offsetWidth,
                scrollviewWidth: scrollviewRef.current.offsetWidth,
              });

              if (isLeftSideInView && isRightSideInView) return;

              // todo: scroll to center card better

              scrollviewRef.current.scrollTo({
                left: card.offsetLeft,
                behavior: 'smooth',
              });
            }
          }}
        />

        <div
          ref={scrollviewRef}
          // the padding is here so `overflow-auto` doesn't cut button hover states
          className="nextra-scrollbar -mx-2 -mb-6 flex snap-x snap-proximity flex-col items-stretch gap-6 overflow-auto px-2 py-6 *:snap-center sm:flex-row sm:*:min-w-[380px] lg:mt-6"
        >
          <PlanCard
            data-plan="Hobby"
            name="Hobby"
            description="For personal or small projects"
            highlighted={highlightedPlan === 'Hobby'}
            adjustable={false}
            price="Free forever"
            callToAction={
              <CallToAction variant="tertiary" href="https://app.graphql-hive.com">
                Get started for free
              </CallToAction>
            }
            features={
              <>
                <PlanFeaturesListItem>
                  <Tooltip content={USAGE_DATA_RETENTION_EXPLAINER}>
                    <strong>7 days</strong> of usage data retention
                  </Tooltip>
                </PlanFeaturesListItem>
                <li className="mb-2 mt-8">Includes:</li>
                <PlanFeaturesListItem>
                  Unlimited seats, projects and organizations
                </PlanFeaturesListItem>
                <PlanFeaturesListItem>Unlimited schema pushes & checks</PlanFeaturesListItem>
                <PlanFeaturesListItem>
                  Full access to all features (including&nbsp;SSO)
                </PlanFeaturesListItem>
                <PlanFeaturesListItem>
                  <Tooltip key="t1" content={OPERATIONS_EXPLAINER}>
                    1M operations per month
                  </Tooltip>
                </PlanFeaturesListItem>
              </>
            }
          />
          <PlanCard
            data-plan="Pro"
            name="Pro"
            description="For scaling API and teams"
            highlighted={highlightedPlan === 'Pro'}
            adjustable
            price={
              <Tooltip content="Base price charged monthly">
                $20<span className="text-base leading-normal text-green-800"> / month</span>
              </Tooltip>
            }
            callToAction={
              <CallToAction variant="primary" href="https://app.graphql-hive.com">
                Try free for 30 days
              </CallToAction>
            }
            features={
              <>
                <PlanFeaturesListItem>
                  <Tooltip content={USAGE_DATA_RETENTION_EXPLAINER}>
                    <strong>90 days</strong> of usage data retention
                  </Tooltip>
                </PlanFeaturesListItem>
                <li className="mb-2 mt-8">Everything in Hobby, plus:</li>
                <PlanFeaturesListItem>
                  <Tooltip key="t1" content={OPERATIONS_EXPLAINER}>
                    $10 per additional 1M operations
                  </Tooltip>
                </PlanFeaturesListItem>
              </>
            }
          />
          <PlanCard
            data-plan="Enterprise"
            name="Enterprise"
            description="Custom plan for large companies"
            highlighted={highlightedPlan === 'Enterprise'}
            adjustable
            price={
              <ContactTextLink className="hover:text-current hover:no-underline">
                Contact us
              </ContactTextLink>
            }
            callToAction={
              <ContactButton variant="primary">Shape a custom plan for your business</ContactButton>
            }
            features={
              <>
                <PlanFeaturesListItem>
                  <Tooltip content={USAGE_DATA_RETENTION_EXPLAINER}>
                    <strong>Custom</strong> data retention
                  </Tooltip>
                </PlanFeaturesListItem>
                <li className="mb-2 mt-8">Everything in Pro, plus:</li>
                <PlanFeaturesListItem>Dedicated Slack channel for support</PlanFeaturesListItem>
                <PlanFeaturesListItem>White-glove onboarding</PlanFeaturesListItem>
                <PlanFeaturesListItem>Bulk volume discount</PlanFeaturesListItem>
                <PlanFeaturesListItem>
                  <span>
                    GraphQL / APIs support and guidance from{' '}
                    <a
                      href="https://the-guild.dev"
                      target="_blank"
                      rel="noreferrer"
                      className="hive-focus -mx-1 -my-0.5 rounded px-1 py-0.5 underline hover:text-blue-700"
                    >
                      The&nbsp;Guild
                    </a>
                  </span>
                </PlanFeaturesListItem>
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
