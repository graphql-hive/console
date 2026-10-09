import { ReactElement, useMemo } from 'react';
import { endOfMonth, startOfDay, startOfMonth } from 'date-fns';
import { useQuery } from 'urql';
import { LayoutContent } from '@/components/layouts/layout-content';
import { BillingView } from '@/components/organization/billing/Billing';
import { CurrencyFormatter } from '@/components/organization/billing/helpers';
import { InvoicesList } from '@/components/organization/billing/InvoicesList';
import { OrganizationUsageEstimationView } from '@/components/organization/Usage';
import { Heading } from '@/components/ui/heading';
import { Meta } from '@/components/ui/meta';
import { PageLead } from '@/components/ui/page-lead';
import { Button } from '@/components/ui/primitives/button/button';
import { Card } from '@/components/ui/primitives/card/card';
import { useChartTheme } from '@/components/ui/primitives/chart/chart-theme';
import { TimeSeriesChart } from '@/components/ui/primitives/chart/time-series-chart';
import { QueryError } from '@/components/ui/query-error';
import Stat from '@/components/ui/stat';
import { graphql, useFragment } from '@/gql';
import { formatNumber, useSlugs } from '@/lib/hooks';
import { Link } from '@tanstack/react-router';

const DateFormatter = Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const SubscriptionPage_OrganizationFragment = graphql(`
  fragment SubscriptionPage_OrganizationFragment on Organization {
    id
    slug
    viewerCanModifyBilling
    billingConfiguration {
      hasPaymentIssues
      canUpdateSubscription
      invoices {
        id
      }
      upcomingInvoice {
        id
        amount
        date
      }
    }
    ...RateLimitWarn_OrganizationFragment
    ...OrganizationInvoicesList_OrganizationFragment
    ...BillingView_OrganizationFragment
    ...OrganizationUsageEstimationView_OrganizationFragment
  }
`);

const SubscriptionPage_QueryFragment = graphql(`
  fragment SubscriptionPage_QueryFragment on Query {
    ...BillingView_QueryFragment
  }
`);

export const SubscriptionPageQuery = graphql(`
  query SubscriptionPageQuery($organizationSlug: String!) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      slug
      ...SubscriptionPage_OrganizationFragment
    }
    ...SubscriptionPage_QueryFragment
    monthlyUsage(selector: { organizationSlug: $organizationSlug }) {
      date
      total
    }
  }
`);

function SubscriptionPageContent() {
  const { organizationSlug } = useSlugs('organization');
  const [query] = useQuery({
    query: SubscriptionPageQuery,
    variables: {
      organizationSlug,
    },
  });

  const currentOrganization = query.data?.organization;

  const organization = useFragment(SubscriptionPage_OrganizationFragment, currentOrganization);
  const queryForBilling = useFragment(SubscriptionPage_QueryFragment, query.data);
  const { colors } = useChartTheme();

  const monthlyUsage = query.data?.monthlyUsage ?? [];
  const monthlyUsagePoints: [string, number][] = useMemo(
    () => monthlyUsage.map(v => [v.date, v.total]),
    [monthlyUsage],
  );

  if (query.error) {
    return <QueryError organizationSlug={organizationSlug} error={query.error} />;
  }

  if (query.fetching) {
    return null;
  }

  if (!currentOrganization || !organization || !queryForBilling) {
    return null;
  }

  const today = startOfDay(new Date());
  const start = startOfMonth(today);
  const end = endOfMonth(today);

  return (
    <LayoutContent className="flex flex-col gap-y-10">
      <div className="grow">
        <div className="flex flex-row items-center justify-between py-6">
          <PageLead title="Your subscription" description="Explore your current plan and usage." />
          {organization.viewerCanModifyBilling && (
            <div>
              <Button
                render={
                  <Link
                    to="/$organizationSlug/view/subscription/manage"
                    params={{ organizationSlug: currentOrganization.slug }}
                  />
                }
              >
                Manage subscription
              </Button>
            </div>
          )}
        </div>
        <div>
          <Card variants={{ onSurface: 'base', titleSize: 'large' }} title="Your current plan">
            <div>
              <BillingView organization={organization} query={queryForBilling}>
                {organization.billingConfiguration?.upcomingInvoice && (
                  <Stat>
                    <Stat.Label>Next Invoice</Stat.Label>
                    <Stat.Number>
                      {CurrencyFormatter.format(
                        organization.billingConfiguration.upcomingInvoice.amount,
                      )}
                    </Stat.Number>
                    <Stat.HelpText>
                      {DateFormatter.format(
                        new Date(organization.billingConfiguration.upcomingInvoice.date),
                      )}
                    </Stat.HelpText>
                  </Stat>
                )}
              </BillingView>
            </div>
          </Card>
          <div className="mt-8">
            <Card variants={{ onSurface: 'base', titleSize: 'large' }} title="Current Usage">
              <p className="text-sm text-fg-secondary">
                {DateFormatter.format(start)} — {DateFormatter.format(end)}
              </p>
              <div className="mt-4">
                <OrganizationUsageEstimationView organization={organization} />
              </div>
            </Card>
          </div>
          {monthlyUsagePoints.length ? (
            <div className="mt-8">
              <Card variants={{ onSurface: 'base', titleSize: 'large' }} title="Historical Usage">
                <div className="mt-4">
                  <TimeSeriesChart
                    kind="bar"
                    height={400}
                    valueFormatter={formatNumber}
                    series={[{ name: 'Events', data: monthlyUsagePoints, color: colors.line }]}
                  />
                </div>
              </Card>
            </div>
          ) : null}
          {organization.billingConfiguration?.invoices?.length ? (
            <div className="mt-8">
              <Card variants={{ onSurface: 'base' }}>
                <Heading>Invoices</Heading>
                <div className="mt-4">
                  <InvoicesList organization={organization} />
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      </div>
    </LayoutContent>
  );
}

export function OrganizationSubscriptionPage(): ReactElement {
  return (
    <>
      <Meta title="Subscription & Usage" />
      <SubscriptionPageContent />
    </>
  );
}
