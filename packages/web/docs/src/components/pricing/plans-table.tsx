'use client';

import { ReactNode, useState } from 'react';
import { CallToAction, cn, Heading, ComparisonTable as Table } from '@theguild/components';
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

  return (
    <section className={cn('py-12 lg:p-24 xl:px-[120px]', className)} data-active-plan={activePlan}>
      <Heading
        size="md"
        as="h3"
        className="text-pretty text-center max-md:text-[32px]/10 max-md:tracking-[-.16px]"
      >
        Hive Gateway allows you to do so much more.
        <br className="max-xl:hidden" /> On&nbsp;your&nbsp;own&nbsp;terms.
      </Heading>
      <p className="mb-8 mt-4 md:mb-16">
        Part of the Hive ecosystem, Hive Gateway is a fully-fledged solution that you can easily
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

      <Table className="[&_td]:border-beige-400 table w-full border-none">
        <thead className="bg-beige-100 max-md:hidden">
          <tr className="*:text-left">
            <th className="rounded-l-3xl p-6 text-xl/6 font-normal">Features</th>
            {pricingTiers.map(tier => (
              <th className="py-6" key={tier.name}>
                <div className="border-beige-400 flex items-center gap-4 border-l px-6 last-of-type:rounded-r-3xl">
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
            description="Consequat orci sed porttitor id dolor donec."
          />
          <tr>
            <PlansTableCell>Operations per month</PlansTableCell>
            <PlansTableCell plan="Hobby">Limit of 100 operations</PlansTableCell>
            <PlansTableCell plan="Pro">
              1M operations per month
              <br />
              Then $10 per million operations
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">Custom operation limit</PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>Usage data retention</PlansTableCell>
            <PlansTableCell plan="Hobby">7 days</PlansTableCell>
            <PlansTableCell plan="Pro">90 days</PlansTableCell>
            <PlansTableCell plan="Enterprise">One year contract</PlansTableCell>
          </tr>

          <TableSubheaderRow
            icon={<UsageIcon />}
            title="Usage"
            description="Consequat orci sed porttitor id dolor donec."
          />
          <tr>
            <PlansTableCell>Scale: projects and organizations</PlansTableCell>
            <PlansTableCell plan="Hobby">Unlimited</PlansTableCell>
            <PlansTableCell plan="Pro">Unlimited</PlansTableCell>
            <PlansTableCell plan="Enterprise">Unlimited</PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>GitHub issues and chat support</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>Schema pushes and checks</PlansTableCell>
            <PlansTableCell plan="Hobby">Unlimited</PlansTableCell>
            <PlansTableCell plan="Pro">Unlimited</PlansTableCell>
            <PlansTableCell plan="Enterprise">Unlimited</PlansTableCell>
          </tr>

          <TableSubheaderRow
            icon={<AvailabilityIcon />}
            title="Availability"
            description="Consequat orci sed porttitor id dolor donec."
          />
          <tr>
            <PlansTableCell>Zero downtime for upgrades</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>100% uptime for schema registry CDN</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>

          <TableSubheaderRow
            icon={<SSOIcon />}
            title="SSO"
            description="Consequat orci sed porttitor id dolor donec."
          />
          <tr>
            <PlansTableCell>Single sign-on via Open ID provider</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>

          <TableSubheaderRow
            icon={<EnterpriseSupportIcon />}
            title="Enterprise Support"
            description="Consequat orci sed porttitor id dolor donec."
          />
          <tr>
            <PlansTableCell>Dedicated Slack channel for support</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>White-glove onboarding</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>Support SLA</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              365 24/7 support, SLA tailored to your needs
            </PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>Technical Account Manager & guidance from The Guild</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>
              Flexible billing options & extended procurement processes
            </PlansTableCell>
            <PlansTableCell plan="Hobby">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
            </PlansTableCell>
          </tr>
          <tr>
            <PlansTableCell>Custom Data Processing Agreements (DPA)</PlansTableCell>
            <PlansTableCell plan="Hobby">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Pro">
              <XIcon className="text-critical-dark size-6" />
            </PlansTableCell>
            <PlansTableCell plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-6" />
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

function PlansTableCell({ plan, children }: { plan?: PlanName; children: ReactNode }) {
  return (
    <td data-plan={plan} className="border-beige-400 border px-4 py-6">
      {children}
    </td>
  );
}

interface TableSubheaderRowProps {
  icon: ReactNode;
  title: string;
  description: string;
}
function TableSubheaderRow({ icon, title, description }: TableSubheaderRowProps) {
  return (
    <tr>
      <td colSpan={4} className="pb-2 pt-8">
        <div className="flex items-center text-[32px]/10 [&>svg]:mr-1 [&>svg]:size-7 [&>svg]:text-green-600">
          {icon}
          {title}
        </div>
        <p className="text-green-800">{description}</p>
      </td>
    </tr>
  );
}
