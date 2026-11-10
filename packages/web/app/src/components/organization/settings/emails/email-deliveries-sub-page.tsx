import { useQuery } from 'urql';
import { DeliveriesOverTime } from '@/components/common/deliveries/deliveries-over-time';
import { DeliveryStatCards } from '@/components/common/deliveries/delivery-stat-cards';
import {
  DELIVERY_WINDOW_LABEL,
  useDeliveryWindow,
} from '@/components/common/deliveries/use-delivery-window';
import { Callout } from '@/components/ui/callout';
import { SubPageLayout, SubPageLayoutHeader } from '@/components/ui/page-content-layout';
import { Spinner } from '@/components/ui/primitives/spinner/spinner';
import { graphql } from '@/gql';
import { useSlugs } from '@/lib/hooks';
import { useKeepPreviousData } from '@/lib/hooks/use-keep-previous-data';
import { useRefetchOnTick } from '@/lib/hooks/use-refetch-on-tick';
import { EmailDeliveriesTable } from './email-deliveries-table';
import { EMAIL_DELIVERIES_POLL_INTERVAL_MS } from './email-polling';

// The window moves with the clock, so the section fetches for itself rather than through the
// route loader, like the alert channel page.
export const EmailDeliveriesSubPage_Query = graphql(`
  query EmailDeliveriesSubPage_Query(
    $organizationSlug: String!
    $period: DateRangeInput!
    $resolution: Int!
  ) {
    organization: organizationBySlug(organizationSlug: $organizationSlug) {
      id
      emailDeliveryStats(period: $period) {
        totalDeliveries
        totalFailures
        deliveriesOverTime(resolution: $resolution) {
          date
          value
        }
        failuresOverTime(resolution: $resolution) {
          date
          value
        }
      }
      emailDeliveryHealth {
        lastSuccessAt
        lastFailureAt
      }
      emailDeliveryLog(period: $period, limit: 50) {
        timestamp
        event
        destination
        ok
        statusCode
        statusText
        durationMs
        attempt
        maxAttempts
        metadata
      }
    }
  }
`);

export function EmailDeliveriesSubPage() {
  const { organizationSlug } = useSlugs('organization');
  const { now, from, to, resolution } = useDeliveryWindow(EMAIL_DELIVERIES_POLL_INTERVAL_MS);

  const [result, reexecuteQuery] = useQuery({
    query: EmailDeliveriesSubPage_Query,
    variables: { organizationSlug, period: { from, to }, resolution },
    requestPolicy: 'cache-and-network',
  });
  useRefetchOnTick(now, reexecuteQuery);

  const data = useKeepPreviousData(result.data, result.fetching || result.stale);
  const organization = data?.organization ?? null;
  const hasNoData = !data;
  const status =
    result.error && hasNoData ? (
      <div className="py-4 text-sm text-critical">
        Failed to load email deliveries: {result.error.message}
      </div>
    ) : result.fetching && hasNoData ? (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    ) : null;
  // Each field is null when ClickHouse could not be read; the organization itself still loads.
  const partiallyUnavailable =
    !!organization &&
    (organization.emailDeliveryStats === null ||
      organization.emailDeliveryHealth === null ||
      organization.emailDeliveryLog === null);

  return (
    <SubPageLayout>
      <SubPageLayoutHeader
        subPageTitle="Email Deliveries"
        description={`Details for emails Hive sent for this organization in ${DELIVERY_WINDOW_LABEL}. Only the kinds of email you have permission to manage are listed. Email bodies and response bodies are not stored for security reasons.`}
      />
      {status ?? (
        <div className="space-y-6">
          {partiallyUnavailable ? (
            <Callout type="error" className="mt-0">
              Some delivery data is unavailable right now
              {result.error ? `: ${result.error.message}` : '.'}
            </Callout>
          ) : null}

          <DeliveryStatCards
            stats={organization?.emailDeliveryStats ?? null}
            health={organization?.emailDeliveryHealth ?? null}
            windowLabel={DELIVERY_WINDOW_LABEL}
            headline={{
              title: 'Emails sent',
              hint: 'Every email handed to the mail provider, whether it accepted or refused it; the refused ones are counted again under Failed. An accepted email can still land in a spam folder, so ask the recipient to check there if it has not arrived.',
            }}
          />

          <DeliveriesOverTime
            stats={organization?.emailDeliveryStats ?? null}
            title="Emails over time"
            description={`Total emails sent and number of failures per interval, over ${DELIVERY_WINDOW_LABEL}`}
            totalLabel="Emails sent"
          />

          <EmailDeliveriesTable deliveries={organization?.emailDeliveryLog ?? null} />
        </div>
      )}
    </SubPageLayout>
  );
}
