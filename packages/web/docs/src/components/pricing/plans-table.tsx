'use client';

import { ReactNode, useState } from 'react';
import {
  CallToAction,
  cn,
  Heading,
  ComparisonTable as Table,
  TextLink,
} from '@theguild/components';
import { CheckmarkIcon, XIcon } from '../../app/gateway/federation-compatible-benchmarks/icons';
import { NestedSticky } from '../nested-sticky';
import {
  AvailabilityIcon,
  EnterpriseSupportIcon,
  OperationsIcon,
  SSOIcon,
  UsageIcon,
} from './icons';
import { TableSubheaderRow } from './table-subheader-row';

type PlanName = 'Hobby' | 'Pro' | 'Enterprise';
interface PricingPlan {
  name: PlanName;
  cta: ReactNode;
}

const pricingTiers: PricingPlan[] = [
  {
    name: 'Hobby',
    cta: (
      <CallToAction
        variant="tertiary"
        // todo: move this style as size="sm" to design system
        className="px-3 py-2 text-sm"
        href="https://app.graphql-hive.com"
      >
        Get started for free
      </CallToAction>
    ),
  },
  {
    name: 'Pro',
    cta: (
      <CallToAction
        variant="primary"
        className="px-3 py-2 text-sm"
        href="https://app.graphql-hive.com"
      >
        Try free for 30 days
      </CallToAction>
    ),
  },
  {
    name: 'Enterprise',
    cta: (
      <CallToAction
        variant="primary"
        className="px-3 py-2 text-sm"
        href="https://the-guild.dev/contact"
      >
        Shape your business
      </CallToAction>
    ),
  },
];

export function PlansTable({ className }: { className?: string }) {
  const [activePlan, setActivePlan] = useState<PlanName>('Hobby');

  const NO = <XIcon className="text-critical-dark mx-auto size-6" />;
  const YES = <CheckmarkIcon className="text-positive-dark mx-auto size-6" />;

  return (
    <section className={cn('relative p-4 py-12 md:px-6 lg:py-24 xl:px-[120px]', className)}>
      <Heading
        size="md"
        as="h3"
        className="text-pretty text-center max-md:text-[32px]/10 max-md:tracking-[-.16px]"
      >
        Hive Console allows you to do so much more.
        <br className="max-xl:hidden" /> On&nbsp;your&nbsp;own&nbsp;terms.
      </Heading>
      <p className="mb-8 mt-4 text-center md:mb-16">
        Part of the Hive ecosystem, Hive Console is a fully-fledged solution that you can easily
        tailor to your&nbsp;needs.
      </p>

      <MobileNavbar setActivePlan={setActivePlan} activePlan={activePlan} />

      <div className="md:nextra-scrollbar md:-mx-6 md:overflow-x-auto md:px-6">
        <NestedSticky offsetTop={80} offsetBottom={90}>
          <div
            aria-hidden
            className="bg-beige-100 [[data-sticky]>&]:border-beige-200 relative flex items-center rounded-3xl border border-transparent *:text-left max-md:hidden md:*:w-1/4 [[data-sticky]>&]:rounded-t-none [[data-sticky]>&]:shadow-sm"
          >
            <div className="z-10 rounded-l-3xl p-6 text-xl/6 font-normal">Features</div>
            {pricingTiers.map(tier => (
              <div className="py-6 last:rounded-r-3xl" key={tier.name}>
                <div className="border-beige-400 flex items-center justify-between gap-4 border-l px-6 sm:[@media(width<1400px)]:[&>a]:hidden">
                  <div className="text-xl/6 font-medium">{tier.name}</div>
                  {tier.cta}
                </div>
              </div>
            ))}
          </div>
        </NestedSticky>
        <Table className="table w-full border-separate border-spacing-0 border-none">
          <thead className="sr-only">
            <tr>
              <th>Features</th>
              {pricingTiers.map(tier => (
                <th key={tier.name}>{tier.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <TableSubheaderRow
              icon={<OperationsIcon />}
              title="Operations and data retention"
              description="Structured by your plan—analyze the limits, manage your potential."
            />
            <tr>
              <PlansTableCell className="whitespace-pre">Operations per month</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                Limit of 100 operations
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                1M operations per month
                <br className="max-sm:inline" />
                Then $10 per million operations
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                Custom operation limit
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>Usage data retention</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                7 days
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                90 days
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                One-year Minimum, Customizable
              </PlansTableCell>
            </tr>

            <TableSubheaderRow
              icon={<UsageIcon />}
              title="Usage"
              description="All plans, all features, all unlimited. Know exactly what you're working with."
            />
            <tr>
              <PlansTableCell>Scale: projects and organizations</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                Unlimited
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                Unlimited
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                Unlimited
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>GitHub issues and chat support</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {YES}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {YES}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>Schema pushes and checks</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                Unlimited
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                Unlimited
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                Unlimited
              </PlansTableCell>
            </tr>

            <TableSubheaderRow
              icon={<AvailabilityIcon />}
              title="Availability"
              description="Engineered for uninterrupted performance and reliability."
            />
            <tr>
              <PlansTableCell>99.95% uptime of operation collection</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell className="lg:whitespace-pre">
                100% uptime of schema registry CDN
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {YES}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {YES}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>

            <TableSubheaderRow
              icon={<SSOIcon />}
              title="SSO"
              description={
                <>
                  Single sign-on via Open ID provider.{' '}
                  <TextLink href="/docs/management/sso-oidc-provider">Learn more.</TextLink>
                </>
              }
            />
            <tr>
              <PlansTableCell>Single sign-on via Open ID provider</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {YES}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {YES}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>

            <TableSubheaderRow
              icon={<EnterpriseSupportIcon />}
              title="Enterprise Support"
              description="Dedicated resources and personalized guidance designed for enterprise-scale needs."
            />
            <tr>
              <PlansTableCell>Dedicated Slack channel for support</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>White-glove onboarding</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>Support SLA</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                <TextLink
                  href="https://the-guild.dev/graphql/hive/sla.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-800"
                >
                  Pre-defined SLA
                </TextLink>
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                <TextLink
                  href="https://the-guild.dev/graphql/hive/sla.pdf"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-800"
                >
                  Pre-defined SLA
                </TextLink>
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                Tailored to your needs
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>Technical Account Manager & guidance from The Guild</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>
                Flexible billing options & extended procurement processes
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>
            <tr>
              <PlansTableCell>Custom Data Processing Agreements (DPA)</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                {NO}
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                {YES}
              </PlansTableCell>
            </tr>
          </tbody>
        </Table>
      </div>
    </section>
  );
}

function MobileNavbar({
  setActivePlan,
  activePlan,
}: {
  setActivePlan: (plan: PlanName) => void;
  activePlan: PlanName;
}) {
  return (
    <NestedSticky
      offsetTop={
        // --nextra-navbar-height
        64
      }
      offsetBottom={482}
    >
      <div className="bg-beige-100 before:bg-beige-100 before:border-b-beige-400 relative top-0 z-10 w-full rounded-2xl p-2 duration-100 ease-[var(--hive-ease-overshoot-a-bit)] before:absolute before:inset-0 before:opacity-0 before:transition md:hidden [[data-sticky]>&:before]:scale-x-125 [[data-sticky]>&:before]:border-b [[data-sticky]>&:before]:opacity-100 [[data-sticky]>&:before]:shadow-sm">
        <div className="relative flex w-full">
          {pricingTiers.map(tier => (
            <button
              key={tier.name}
              onClick={() => setActivePlan(tier.name)}
              className={cn(
                'hive-focus bg-beige-100 flex-1 rounded-xl px-3 py-2 text-center text-sm font-medium leading-5 transition hover:z-10 hover:ring hover:ring-inset focus:z-10',
                activePlan === tier.name && 'bg-white',
              )}
            >
              {tier.name}
            </button>
          ))}
        </div>
        <div className="relative mt-3 h-9">
          {pricingTiers.map((plan, i) => {
            const isActive = plan.name === activePlan;

            return (
              <div
                className={cn(
                  'absolute inset-0 z-10 flex items-center justify-center rounded-lg *:!w-full aria-hidden:pointer-events-none aria-hidden:z-0',
                  i === 0 && 'bg-beige-100',
                )}
                aria-hidden={!isActive}
                key={plan.name}
              >
                {plan.cta}
              </div>
            );
          })}
        </div>
      </div>
    </NestedSticky>
  );
}

function PlansTableCell({
  plan,
  activePlan: currentPlan,
  children,
  className,
}: {
  plan?: PlanName;
  activePlan?: PlanName;
  children: ReactNode;
  className?: string;
}) {
  return (
    <td
      aria-hidden={plan !== currentPlan}
      className={cn(
        'border-beige-400 border-b border-r p-4 first:border-l first:font-medium max-md:w-1/2 max-sm:text-sm sm:py-6 md:w-1/4 [&:not(:first-child)]:border-l-0 [&:not(:first-child)]:text-center [&:not(:first-child)]:text-sm [&:not(:first-child)]:text-green-800 md:[.subheader+tr>&:last-child]:rounded-tr-3xl max-md:[.subheader+tr>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-tr-3xl [.subheader+tr>&]:border-t [.subheader+tr>&]:first:rounded-tl-3xl md:[tr:is(:has(+.subheader),:last-child)>&:last-child]:rounded-br-3xl max-md:[tr:is(:has(+.subheader),:last-child)>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-br-3xl [tr:is(:last-child,:has(+.subheader))>&]:first:rounded-bl-3xl',
        plan && plan !== currentPlan && 'max-md:hidden',
        className,
      )}
    >
      {children}
    </td>
  );
}
