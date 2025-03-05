'use client';

import { ReactNode, useState } from 'react';
import { CallToAction, cn, Heading, ComparisonTable as Table } from '@theguild/components';
import { CheckmarkIcon, XIcon } from '../../app/gateway/federation-compatible-benchmarks/icons';

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

  const getActivePlanIndex = (): number => {
    return pricingTiers.findIndex(tier => tier.name === activePlan);
  };

  const activePlanIndex = getActivePlanIndex();

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

      <Table className="table w-full border-none">
        <thead className="bg-beige-100 max-md:hidden">
          <Table.Row className="*:text-left">
            <th className="rounded-l-3xl py-6 pl-6 text-xl/6 font-normal">Features</th>
            {pricingTiers.map(tier => (
              <th className="py-6" key={tier.name}>
                <div className="border-beige-400 flex items-center gap-4 border-l pl-6">
                  <div className="text-xl/6 font-medium">{tier.name}</div>
                  {tier.cta}
                </div>
              </th>
            ))}
          </Table.Row>
        </thead>
        <tbody>
          {/* Mobile CTA row */}
          <Table.Row className="md:hidden">
            <Table.Cell colSpan={2} className="py-4">
              todo
            </Table.Cell>
          </Table.Row>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Operations and data retention
            </td>
          </tr>
          <tr>
            <td>Operations per month</td>
            <td data-plan="Hobby">Limit of 100 operations</td>
            <td data-plan="Pro">
              1M operations per month
              <br />
              Then $10 per million operations
            </td>
            <td data-plan="Enterprise">Custom operation limit</td>
          </tr>
          <tr>
            <td>Usage data retention</td>
            <td data-plan="Hobby">7 days</td>
            <td data-plan="Pro">90 days</td>
            <td data-plan="Enterprise">One year contract</td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Usage
            </td>
          </tr>
          <tr>
            <td>Scale: projects and organizations</td>
            <td data-plan="Hobby">Unlimited</td>
            <td data-plan="Pro">Unlimited</td>
            <td data-plan="Enterprise">Unlimited</td>
          </tr>
          <tr>
            <td>GitHub issues and chat support</td>
            <td data-plan="Hobby">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td data-plan="Pro">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>
          <tr>
            <td>Schema pushes and checks</td>
            <td data-plan="Hobby">Unlimited</td>
            <td data-plan="Pro">Unlimited</td>
            <td data-plan="Enterprise">Unlimited</td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Availability
            </td>
          </tr>
          <tr>
            <td>Zero downtime for upgrades</td>
            <td data-plan="Hobby">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Pro">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>
          <tr>
            <td>100% uptime for schema registry CDN</td>
            <td data-plan="Hobby">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td data-plan="Pro">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              SSO
            </td>
          </tr>
          <tr>
            <td>Single sign-on via Open ID provider</td>
            <td data-plan="Hobby">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td data-plan="Pro">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Enterprise Support
            </td>
          </tr>
          <tr>
            <td>Dedicated Slack channel for support</td>
            <td data-plan="Hobby">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Pro">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>
          <tr>
            <td>White-glove onboarding</td>
            <td data-plan="Hobby">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Pro">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>
          <tr>
            <td>Support SLA</td>
            <td data-plan="Hobby">
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </td>
            <td data-plan="Pro">
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </td>
            <td data-plan="Enterprise">365 24/7 support, SLA tailored to your needs</td>
          </tr>
          <tr>
            <td>Technical Account Manager & guidance from The Guild</td>
            <td data-plan="Hobby">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Pro">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>
          <tr>
            <td>Flexible billing options & extended procurement processes</td>
            <td data-plan="Hobby">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Pro">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>
          <tr>
            <td>Custom Data Processing Agreements (DPA)</td>
            <td data-plan="Hobby">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Pro">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td data-plan="Enterprise">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
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
