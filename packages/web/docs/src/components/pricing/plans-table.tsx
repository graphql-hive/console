'use client';

import { useState } from 'react';
import { cn, ComparisonTable as Table } from '@theguild/components';
import { CheckmarkIcon, XIcon } from '../../app/gateway/federation-compatible-benchmarks/icons';

interface PricingTier {
  name: 'Hobby' | 'Pro' | 'Enterprise';
  cta: {
    text: string;
    href: string;
  };
  isHighlighted?: boolean;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Hobby',
    cta: {
      text: 'Get started for free',
      href: '/register',
    },
  },
  {
    name: 'Pro',
    cta: {
      text: 'Try free for 30 days',
      href: '/register?plan=pro',
    },
  },
  {
    name: 'Enterprise',
    cta: {
      text: 'Share your business',
      href: '/contact',
    },
    isHighlighted: true,
  },
];

export function PlansTable() {
  type Plan = 'Hobby' | 'Pro' | 'Enterprise';
  // State to track which plan is active for mobile view
  const [activePlan, setActivePlan] = useState<Plan>('Hobby');

  return (
    <div className="w-full">
      {/* Sticky navbar for mobile view */}
      <div className="sticky top-0 z-10 flex w-full overflow-hidden rounded-t-lg bg-blue-100 md:hidden">
        <div className="flex w-full">
          {pricingTiers.map((tier, index) => (
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

      <Table className="table w-full">
        <thead className="hidden md:table-header-group">
          <tr className="*:text-left">
            <th>Features</th>
            {pricingTiers.map(tier => (
              <th key={tier.name} className={tier.isHighlighted ? 'bg-green-100' : ''}>
                <div className="flex flex-col items-center">
                  <div className="text-lg font-semibold">{tier.name}</div>
                  <a
                    href={tier.cta.href}
                    className={cn(
                      'mt-2 rounded-full px-4 py-1 text-sm',
                      tier.isHighlighted
                        ? 'bg-green-400 text-black hover:bg-green-500'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200',
                    )}
                  >
                    {tier.cta.text}
                  </a>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* Mobile CTA row */}
          <tr className="md:hidden">
            <td colSpan={2} className="py-4">
              <a
                href={pricingTiers[activePlan].cta.href}
                className={cn(
                  'block w-full rounded-full px-4 py-2 text-center font-medium',
                  pricingTiers[activePlan].isHighlighted
                    ? 'bg-green-400 text-black hover:bg-green-500'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200',
                )}
              >
                {pricingTiers[activePlan].cta.text}
              </a>
            </td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Operations and data retention
            </td>
          </tr>
          <tr>
            <td>Operations per month</td>
            <td className={cn('hidden md:table-cell')}>Limit of 100 operations</td>
            <td className={cn('hidden md:table-cell')}>
              1M operations per month
              <br />
              Then $10 per million operations
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              Custom operation limit
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              Limit of 100 operations
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              1M operations per month
              <br />
              Then $10 per million operations
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              Custom operation limit
            </td>
          </tr>
          <tr>
            <td>Usage data retention</td>
            <td className="hidden md:table-cell">7 days</td>
            <td className="hidden md:table-cell">90 days</td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              One year contract
            </td>
            <td className={cn('md:hidden', activePlan === 'Hobby' ? 'table-cell' : 'hidden')}>
              7 days
            </td>
            <td className={cn('md:hidden', activePlan === 'Pro' ? 'table-cell' : 'hidden')}>
              90 days
            </td>
            <td className={cn('md:hidden', activePlan === 'Enterprise' ? 'table-cell' : 'hidden')}>
              One year contract
            </td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Usage
            </td>
          </tr>
          <tr>
            <td>Scale: projects and organizations</td>
            <td className="hidden md:table-cell">Unlimited</td>
            <td className="hidden md:table-cell">Unlimited</td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              Unlimited
            </td>
            <td className={cn('md:hidden', activePlan === 'Hobby' ? 'table-cell' : 'hidden')}>
              Unlimited
            </td>
            <td className={cn('md:hidden', activePlan === 'Pro' ? 'table-cell' : 'hidden')}>
              Unlimited
            </td>
            <td className={cn('md:hidden', activePlan === 'Enterprise' ? 'table-cell' : 'hidden')}>
              Unlimited
            </td>
          </tr>
          <tr>
            <td>GitHub issues and chat support</td>
            <td className="hidden md:table-cell">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td className="hidden md:table-cell">
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckmarkIcon className="text-positive-dark size-5" />
            </td>
          </tr>
          <tr>
            <td>Schema pushes and checks</td>
            <td className="hidden md:table-cell">Unlimited</td>
            <td className="hidden md:table-cell">Unlimited</td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              Unlimited
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              Unlimited
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              Unlimited
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              Unlimited
            </td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Availability
            </td>
          </tr>
          <tr>
            <td>Zero downtime for upgrades</td>
            <td className="hidden md:table-cell">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td className="hidden md:table-cell">
              <XIcon className="text-critical-dark size-5" />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" className="text-positive-dark" />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>
          <tr>
            <td>100% uptime for schema registry CDN</td>
            <td className="hidden md:table-cell">
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td className="hidden md:table-cell">
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              SSO
            </td>
          </tr>
          <tr>
            <td>Single sign-on via Open ID provider</td>
            <td className="hidden md:table-cell">
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td className="hidden md:table-cell">
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>

          <tr className="text-lg font-medium">
            <td colSpan={4} className="pb-2 pt-8">
              Enterprise Support
            </td>
          </tr>
          <tr>
            <td>Dedicated Slack channel for support</td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>
          <tr>
            <td>White-glove onboarding</td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>
          <tr>
            <td>Support SLA</td>
            <td className="hidden md:table-cell">
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </td>
            <td className="hidden md:table-cell">
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              365 24/7 support, SLA tailored to your needs
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <a
                href="https://the-guild.dev/graphql/hive/sla.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Pre-defined SLA
              </a>
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              365 24/7 support, SLA tailored to your needs
            </td>
          </tr>
          <tr>
            <td>Technical Account Manager & guidance from The Guild</td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>
          <tr>
            <td>Flexible billing options & extended procurement processes</td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>
          <tr>
            <td>Custom Data Processing Agreements (DPA)</td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className="hidden md:table-cell">
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td
              className={cn(
                'hidden md:table-cell',
                pricingTiers[2].isHighlighted ? 'bg-green-100' : '',
              )}
            >
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
            {/* Mobile visible cell */}
            <td className={cn('md:hidden', activePlan === 0 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 1 ? 'table-cell' : 'hidden')}>
              <XIcon className="size-5" style={{ color: functionalTones.criticalDark }} />
            </td>
            <td className={cn('md:hidden', activePlan === 2 ? 'table-cell' : 'hidden')}>
              <CheckIcon className="size-5" style={{ color: functionalTones.positiveDark }} />
            </td>
          </tr>
        </tbody>
      </Table>
    </div>
  );
}
