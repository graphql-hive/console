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
    <section
      className={cn('p-4 py-12 md:px-6 lg:p-24 xl:px-[120px]', className)}
      data-active-plan={activePlan}
    >
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
        tailor to your needs.
      </p>

      <MobileNavbar setActivePlan={setActivePlan} activePlan={activePlan} />

      <style jsx global>{`
        @media (max-width: 767px) {
          [data-active-plan] td[data-plan] {
            display: none;
          }

          [data-active-plan='Hobby'] td[data-plan='Hobby'],
          [data-active-plan='Pro'] td[data-plan='Pro'],
          [data-active-plan='Enterprise'] td[data-plan='Enterprise'] {
            display: table-cell;
          }
        }
      `}</style>

      <Table className="table w-full border-separate border-spacing-0 border-none">
        <thead className="bg-beige-100 max-md:hidden">
          <tr className="*:text-left">
            <th className="rounded-l-3xl p-6 text-xl/6 font-normal">Features</th>
            {pricingTiers.map(tier => (
              <th className="py-6 last:rounded-r-3xl" key={tier.name}>
                <div className="border-beige-400 flex items-center justify-between gap-4 border-l px-6">
                  <div className="text-xl/6 font-medium">{tier.name}</div>
                  {tier.cta}
                </div>
              </th>
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
            <PlansTableCell>Operations per month</PlansTableCell>
            <PlansTableCell activePlan={activePlan} plan="Hobby">
              Limit of 100 operations
            </PlansTableCell>
            <PlansTableCell activePlan={activePlan} plan="Pro">
              1M operations per month
              <br />
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
            description="All plans, all features, all unlimited. Know exactly what you’re working with."
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
            <PlansTableCell className="md:whitespace-pre">
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
    <div className="bg-beige-100 sticky top-0 z-10 flex w-full overflow-hidden rounded-t-lg md:hidden">
      <div className="flex w-full">
        {pricingTiers.map(tier => (
          <button
            key={tier.name}
            onClick={() => setActivePlan(tier.name)}
            className={cn(
              'flex-1 px-2 py-3 text-center font-medium transition-colors',
              activePlan === tier.name
                ? 'bg-blue-200 text-blue-900'
                : 'text-blue-800 hover:bg-blue-200',
            )}
          >
            {tier.name}
          </button>
        ))}
      </div>
    </div>
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
      data-plan={plan}
      className={cn(
        'border-beige-400 border-b border-r px-4 py-6 first:border-l first:font-medium xl:w-1/4 [&:not(:first-child)]:border-l-0 [&:not(:first-child)]:text-center [&:not(:first-child)]:text-sm [&:not(:first-child)]:text-green-800 sm:[.subheader+tr>&:last-child]:rounded-tr-3xl max-sm:[.subheader+tr>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-tr-3xl [.subheader+tr>&]:border-t [.subheader+tr>&]:first:rounded-tl-3xl sm:[tr:is(:has(+.subheader),:last-child)>&:last-child]:rounded-br-3xl max-sm:[tr:is(:has(+.subheader),:last-child)>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-br-3xl [tr:is(:last-child,:has(+.subheader))>&]:first:rounded-bl-3xl',
        className,
      )}
    >
      {children}
    </td>
  );
}

interface TableSubheaderRowProps {
  icon: ReactNode;
  title: string;
  description: ReactNode;
}
function TableSubheaderRow({ icon, title, description }: TableSubheaderRowProps) {
  return (
    // eslint-disable-next-line tailwindcss/no-custom-classname
    <tr className="subheader">
      <td colSpan={4} className="pb-6 pt-8">
        <div className="flex items-center text-[32px]/10 [&>svg]:m-[6.67px] [&>svg]:mr-[10.67px] [&>svg]:size-[26.67px] [&>svg]:text-green-600">
          {icon}
          {title}
        </div>
        <p className="mt-2 text-green-800">{description}</p>
      </td>
    </tr>
  );
}
