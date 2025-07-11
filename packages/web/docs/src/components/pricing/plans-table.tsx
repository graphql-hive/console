'use client';

import { ReactNode, useState } from 'react';
import { LuGlobeLock, LuPackage, LuUserRound } from 'react-icons/lu';
import {
  CallToAction,
  cn,
  Heading,
  ComparisonTable as Table,
  TextLink,
} from '@theguild/components';
import { CheckmarkIcon, XIcon } from '../../app/gateway/federation-compatible-benchmarks/icons';
import { GatewayIcon } from '../icons';
import { NestedSticky } from '../nested-sticky';
import { AvailabilityIcon, EnterpriseSupportIcon, UsageIcon } from './icons';

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
              icon={<LuUserRound />}
              title="Organization and Team"
              description="Structure teams your way. No enterprise tax."
            />

            <tr>
              <PlansTableCell className="whitespace-pre">Maximum team size</PlansTableCell>
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
              <PlansTableCell className="whitespace-pre">
                <TextLink href="/docs/management/sso-oidc-provider" target="_blank">
                  Single Sign-On (SSO)
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink href="/docs/management/members-roles-permissions" target="_blank">
                  Role-based Access Control (RBAC)
                </TextLink>
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

            <tr>
              <PlansTableCell className="whitespace-pre">
                <TextLink href="/docs/graphql-api" target="_blank">
                  GraphQL Management API
                </TextLink>
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
              icon={<LuPackage />}
              title="Projects"
              description="Experiment, iterate and ship to production in no time."
            />

            <tr>
              <PlansTableCell>Maximum subgraph count</PlansTableCell>
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
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/schema-registry#publish-a-schema">
                  Subgraph/schema publishes
                </TextLink>
              </PlansTableCell>
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
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/schema-registry#check-a-schema">
                  Subgraph/schema checks
                </TextLink>
              </PlansTableCell>
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
              <PlansTableCell>
                <TextLink href="/docs/schema-registry/contracts" target="_blank">
                  Schema Contracts
                </TextLink>
              </PlansTableCell>
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
              <PlansTableCell>
                <TextLink href="/docs/schema-registry/schema-policy" target="_blank">
                  Schema Linting
                </TextLink>
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
              icon={<UsageIcon />}
              title="Analytics, Monitoring & Metrics"
              description="Monitor and evolve your schema in a flexible way."
            />

            <tr>
              <PlansTableCell>
                <TextLink href=" /docs/schema-registry/usage-reporting" target="_blank">
                  Operation usage reporting and insights
                </TextLink>
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

            <tr>
              <PlansTableCell className="whitespace-pre">Usage reporting per month</PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Hobby">
                1M operations per month
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Pro">
                1M operations per month
                <br className="max-sm:inline" />
                <span className="font-normal">Then $10 per 1 million operations</span>
              </PlansTableCell>
              <PlansTableCell activePlan={activePlan} plan="Enterprise">
                Volume discount negotiable
              </PlansTableCell>
            </tr>

            <tr>
              <PlansTableCell>Schema usage data retention</PlansTableCell>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  href="/docs/management/targets#conditional-breaking-changes"
                  target="_blank"
                >
                  Traffic-based breaking change detection
                </TextLink>
              </PlansTableCell>
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

            <tr>
              <PlansTableCell>Schema check retention</PlansTableCell>
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
              icon={<GatewayIcon />}
              title="Gateway"
              description="Performant and extendible. Stress-tested in production."
            />

            <tr>
              <PlansTableCell>Self-host</PlansTableCell>
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
              <PlansTableCell>
                Apollo Federation v1 support
                <br />
                <TextLink
                  href="/federation-gateway-audit"
                  target="_blank"
                  className="text-sm text-green-800"
                >
                  Check out the federation audit
                </TextLink>
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

            <tr>
              <PlansTableCell>
                Apollo Federation v2 support
                <br />
                <TextLink
                  href="/federation-gateway-audit"
                  target="_blank"
                  className="text-sm text-green-800"
                >
                  Check out the federation audit
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/gateway/subscriptions">
                  Subscriptions over WebSocket and SSE
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/gateway/authorization-authentication">
                  JWT authentication
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  target="_blank"
                  href="docs/gateway/authorization-authentication#rolescope-based-authentication-rbac-with-requiresscope-directive"
                >
                  Role-based Access Control (RBAC)
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/gateway/persisted-documents">
                  Persisted documents
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  target="_blank"
                  href="/docs/gateway/monitoring-tracing#opentelemetry-traces"
                >
                  OpenTelemetry (OTEL) tracing
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  target="_blank"
                  href="/docs/gateway/monitoring-tracing#prometheus-metrics"
                >
                  Prometheus metrics
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  target="_blank"
                  href="/docs/gateway/other-features/security/demand-control"
                >
                  Demand control
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  target="_blank"
                  href="/docs/gateway/other-features/security/rate-limiting"
                >
                  Rate limiting
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  target="_blank"
                  href="/docs/gateway/other-features/security/hmac-signature"
                >
                  Subgraph request signing
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink
                  target="_blank"
                  href="/docs/gateway/other-features/performance/response-caching"
                >
                  Response caching
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/gateway/defer-stream">
                  Incremental Delivery (Defer & Stream)
                </TextLink>
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

            <tr>
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/gateway/other-features/custom-plugins">
                  Custom plugins
                </TextLink>
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
              icon={<AvailabilityIcon />}
              title="Availability"
              description="Engineered for uninterrupted performance and reliability."
            />
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
            <tr>
              <PlansTableCell>99.95% uptime for usage/analytics</PlansTableCell>
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
              <PlansTableCell>99.95% uptime for dashboard</PlansTableCell>
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

            <TableSubheaderRow
              icon={<EnterpriseSupportIcon />}
              title="Support"
              description="You can rely on us when you need help."
            />
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

            <TableSubheaderRow
              icon={<LuGlobeLock />}
              title="Compliance / Security"
              description="Enterprise-grade software, affordable for everyone."
            />
            <tr>
              <PlansTableCell>
                SOC 2 Type II Certified
                <br />
                <TextLink
                  href="https://security.graphql-hive.com"
                  target="_blank"
                  className="text-sm text-green-800"
                >
                  Learn more
                </TextLink>
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
            <tr>
              <PlansTableCell>
                <TextLink target="_blank" href="/docs/management/audit-logs">
                  Audit logs
                </TextLink>
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
        'border-beige-400 border-b border-r p-4 font-medium first:border-l first:font-medium max-md:w-1/2 max-sm:text-sm sm:py-6 md:w-1/4 [&:not(:first-child)]:border-l-0 [&:not(:first-child)]:text-center [&:not(:first-child)]:text-sm [&:not(:first-child)]:text-green-800 md:[.subheader+tr>&:last-child]:rounded-tr-3xl max-md:[.subheader+tr>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-tr-3xl [.subheader+tr>&]:border-t [.subheader+tr>&]:first:rounded-tl-3xl md:[tr:is(:has(+.subheader),:last-child)>&:last-child]:rounded-br-3xl max-md:[tr:is(:has(+.subheader),:last-child)>&:not(:first-child,:has(+td[aria-hidden=false]))]:rounded-br-3xl [tr:is(:last-child,:has(+.subheader))>&]:first:rounded-bl-3xl',
        plan && plan !== currentPlan && 'max-md:hidden',
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
    <tr className="subheader">
      <td colSpan={4} className="pb-6 pt-8">
        <div className="flex items-center text-[32px]/10 max-md:text-[20px]/6 max-md:font-medium [&>svg]:m-[6.67px] [&>svg]:mr-[10.67px] [&>svg]:size-[26.67px] [&>svg]:text-green-600">
          {icon}
          {title}
        </div>
        <p className="mt-2 text-green-800">{description}</p>
      </td>
    </tr>
  );
}
