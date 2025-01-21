'use client';

import { HTMLAttributes, ReactElement, ReactNode } from 'react';
import { Arrow, Content, Root, Trigger } from '@radix-ui/react-tooltip';
import { CallToAction, cn, ContactTextLink } from '@theguild/components';
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

function Plan(props: {
  name: string;
  description: string;
  price: ReactNode | string;
  features: ReactNode;
  linkText: string;
  linkOnClick?: () => void;
  adjustable: boolean;
}): ReactElement {
  return (
    <article className="w-1/3">
      <header className="text-green-800">
        <div className="flex flex-row items-center gap-2">
          <h2 className="text-2xl font-medium">{props.name}</h2>
          {props.adjustable && (
            <span className="whitespace-nowrap rounded-full bg-green-100 px-3 py-1 text-sm font-medium leading-5">
              Adjust your plan at any time
            </span>
          )}
        </div>
        <p className="mt-2">{props.description}</p>
      </header>
      <div className="mt-4 text-5xl leading-[56px] tracking-[-0.48px]">{props.price}</div>
      <div className="mt-4">
        <CallToAction
          variant="primary"
          {...(props.linkOnClick
            ? {
                href: '#',
                onClick: event => {
                  event.preventDefault();
                  props.linkOnClick?.();
                },
              }
            : { href: 'https://app.graphql-hive.com' })}
        >
          {props.linkText}
        </CallToAction>
      </div>
      <ul className="mt-4 text-green-800">{props.features}</ul>
    </article>
  );
}

function PlanFeaturesListItem(props: HTMLAttributes<HTMLLIElement>) {
  return <li className="border-beige-200 py-2 [&:not(:last-child)]:border-b" {...props} />;
}

const USAGE_DATA_RETENTION_EXPLAINER = 'How long your GraphQL operations are stored on Hive';
const OPERATIONS_EXPLAINER = 'GraphQL operations reported to GraphQL Hive';

export function Pricing({
  children,
  className,
}: {
  children?: ReactNode;
  className?: string;
}): ReactElement {
  return (
    <section className={cn('py-12 sm:py-20', className)}>
      <div className="mx-auto box-border w-full max-w-[1200px]">
        {children}

        <div
          // the padding is here so `overflow-auto` doesn't cut button hover states
          className="-mx-2 overflow-auto px-2"
        >
          <div
            className={cn(
              'flex min-w-[1000px] flex-row items-stretch gap-8 px-6 lg:gap-10 xl:gap-12 xl:px-0',
              children && 'mt-16 lg:mt-24',
            )}
          >
            <Plan
              name="Hobby"
              description="For personal or small projects"
              adjustable={false}
              price="Free forever"
              linkText="Start for free"
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
            <Plan
              name="Pro"
              description="For scaling API and teams"
              adjustable
              price={
                <Tooltip content="Base price charged monthly">
                  $20<span className="text-base leading-normal text-green-800"> / month</span>
                </Tooltip>
              }
              linkText="🎉 Try free for 30 days"
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
                  <PricingSlider className="pt-4" />
                </>
              }
            />
            <Plan
              name="Enterprise"
              description="Custom plan for large companies"
              adjustable
              price={
                <span
                  className="cursor-pointer"
                  onClick={() => {
                    (window as any).$crisp?.push(['do', 'chat:open']);
                  }}
                >
                  Contact us
                </span>
              }
              linkText="Shape a custom plan for your business"
              linkOnClick={() => {
                (window as any).$crisp?.push(['do', 'chat:open']);
              }}
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
      </div>
    </section>
  );
}
