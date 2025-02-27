'use client';

import { HTMLAttributes, ReactElement, ReactNode, useRef, useState } from 'react';
import { Arrow, Content, Root, Trigger } from '@radix-ui/react-tooltip';
import {
  CallToAction,
  cn,
  ContactButton,
  ContactTextLink,
  Heading,
  ShieldFlashIcon,
  TextLink,
} from '@theguild/components';
import { CheckIcon } from '../check-icon';
import {
  AvailabilityIcon,
  BillingIcon,
  EnterpriseSupportIcon,
  FeaturesIcon,
  OperationsIcon,
  RetentionIcon,
  ShortCheckmarkIcon,
  SSOIcon,
  UsageIcon,
} from './icons';
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
        <Arrow className="fill-green-1000" width={9} />
      </Content>
    </Root>
  );
}

interface PlanFeaturesListItemProps extends HTMLAttributes<HTMLLIElement> {
  icon: ReactNode;
  category: string;
  features: ReactNode[];
  tooltip?: string;
}

function PlanFeaturesListItem({
  icon,
  category,
  features,
  tooltip,
  ...rest
}: PlanFeaturesListItemProps) {
  const content = (
    <>
      <strong className="flex h-6 items-center gap-2 font-bold [&>svg]:size-4 [&>svg]:text-green-600">
        {icon}
        {category}
      </strong>
      {features.map((feature, index) => (
        <span key={index} className="mt-2 flex gap-2 leading-6">
          <ShortCheckmarkIcon className="my-1 size-4 text-green-600" />
          {feature}
        </span>
      ))}
    </>
  );
  return (
    <li
      className="border-beige-200 flex flex-col px-1 py-2 text-sm text-[#4F6C6A] [&:not(:last-child)]:border-b"
      {...rest}
    >
      {tooltip ? <Tooltip content={tooltip}>{content}</Tooltip> : content}
    </li>
  );
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

              const { left, right } = card.getBoundingClientRect();
              const containerRect = scrollviewRef.current.getBoundingClientRect();
              const scrollLeft = scrollviewRef.current.scrollLeft;
              const containerLeft = containerRect.left;
              const padding = parseInt(window.getComputedStyle(scrollviewRef.current).paddingLeft);

              const cardLeftRelativeToContainer = left - containerLeft;
              const cardRightRelativeToContainer = right - containerLeft;

              if (
                cardLeftRelativeToContainer >= padding &&
                cardRightRelativeToContainer <= containerRect.width - padding
              ) {
                return;
              }

              let targetScrollLeft = scrollLeft;

              if (cardLeftRelativeToContainer < padding) {
                targetScrollLeft = scrollLeft - (padding - cardLeftRelativeToContainer);
              } else if (cardRightRelativeToContainer > containerRect.width - padding) {
                targetScrollLeft =
                  scrollLeft + (cardRightRelativeToContainer - (containerRect.width - padding));
              }

              scrollviewRef.current.scrollTo({
                left: targetScrollLeft,
                behavior: 'smooth',
              });
            }
          }}
        />

        <div
          ref={scrollviewRef}
          // the padding is here so `overflow-auto` doesn't cut button hover states
          className="nextra-scrollbar -mx-4 -mb-6 flex flex-col items-stretch gap-6 px-4 py-6 sm:flex-row sm:overflow-auto sm:*:min-w-[380px] md:-mx-6 md:px-6 lg:mt-6"
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
                <PlanFeaturesListItem
                  icon={<OperationsIcon />}
                  category="Operations per month"
                  features={['1M operations per month']}
                  tooltip={OPERATIONS_EXPLAINER}
                />
                <PlanFeaturesListItem
                  icon={<RetentionIcon />}
                  category="Usage data retention"
                  features={['7 days']}
                  tooltip={USAGE_DATA_RETENTION_EXPLAINER}
                />
                <PlanFeaturesListItem
                  icon={<FeaturesIcon />}
                  category="Features"
                  features={['Full access to everything!']}
                />
                <PlanFeaturesListItem
                  icon={<UsageIcon />}
                  category="Usage"
                  features={[
                    'Unlimited seats, projects and organizations',
                    'GitHub issues and chat support',
                    'Unlimited schema pushes and checks',
                  ]}
                />
                <PlanFeaturesListItem
                  icon={<ShieldFlashIcon />}
                  category="Availability"
                  features={['99.95% uptime for operation', '100% uptime for schema registry CDN']}
                />
                <PlanFeaturesListItem
                  icon={<SSOIcon />}
                  category="SSO"
                  features={['Single sign-on via Open ID provider']}
                />
              </>
            }
          />
          <PlanCard
            data-plan="Pro"
            name="Pro"
            description="For scaling API and teams"
            highlighted={highlightedPlan === 'Pro'}
            adjustable
            startingFrom
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
                <PlanFeaturesListItem
                  icon={<OperationsIcon />}
                  category="Operations per month"
                  features={[
                    <span>
                      1M operations per month
                      <small className="block text-xs">Then $10 per million operations</small>
                    </span>,
                  ]}
                  tooltip={OPERATIONS_EXPLAINER}
                />
                <PlanFeaturesListItem
                  icon={<RetentionIcon />}
                  category="Usage data retention"
                  features={['90 days']}
                  tooltip={USAGE_DATA_RETENTION_EXPLAINER}
                />
                <PlanFeaturesListItem
                  icon={<FeaturesIcon />}
                  category="Features"
                  features={['Everything in Hobby, plus the ability to scale past 1M operations.']}
                />
                <PlanFeaturesListItem
                  icon={<UsageIcon />}
                  category="Usage"
                  features={[
                    'Unlimited seats, projects and organizations',
                    'GitHub issues and chat support',
                    'Unlimited schema pushes and checks',
                  ]}
                />
                <PlanFeaturesListItem
                  icon={<AvailabilityIcon />}
                  category="Availability"
                  features={['99.95% uptime for operation', '100% uptime for schema registry CDN']}
                />
                <PlanFeaturesListItem
                  icon={<SSOIcon />}
                  category="SSO"
                  features={['Single sign-on via Open ID provider']}
                />
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
              <ContactButton variant="primary">
                Shape a custom plan
                <span className="hidden sm:inline">for your business</span>
              </ContactButton>
            }
            features={
              <>
                <PlanFeaturesListItem
                  icon={<OperationsIcon />}
                  category="Operations per month"
                  features={['Custom operations limit']}
                  tooltip={OPERATIONS_EXPLAINER}
                />
                <PlanFeaturesListItem
                  icon={<RetentionIcon />}
                  category="Usage data retention"
                  features={['One year contract']}
                  tooltip={USAGE_DATA_RETENTION_EXPLAINER}
                />
                <PlanFeaturesListItem
                  icon={<FeaturesIcon />}
                  category="Features"
                  features={['Everything in Pro, plus full enterprise support.']}
                />
                <PlanFeaturesListItem
                  icon={<EnterpriseSupportIcon />}
                  category="Enterprise support"
                  features={[
                    'Dedicated Slack channel for support',
                    'White-glove onboarding',
                    <span>
                      GraphQL / APIs support and guidance from{' '}
                      <TextLink href="https://theguild.dev">The&nbsp;Guild</TextLink>
                    </span>,
                    '365, 24/7 support, SLA tailored to your needs',
                    'Custom Data Processing Agreements (DPA)',
                  ]}
                />
                <PlanFeaturesListItem
                  icon={<AvailabilityIcon />}
                  category="Availability"
                  features={['99.95% uptime for operation', '100% uptime for schema registry CDN']}
                />
                <PlanFeaturesListItem
                  icon={<SSOIcon />}
                  category="SSO"
                  features={['Single sign-on via Open ID provider']}
                />
                <PlanFeaturesListItem
                  icon={<BillingIcon />}
                  category="Customized Billing"
                  features={[
                    'Flexible billing options tailored to enterprise procurement processes',
                  ]}
                />
              </>
            }
          />
        </div>
      </div>
    </section>
  );
}
