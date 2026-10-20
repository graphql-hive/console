import { ReactElement } from 'react';
import { Callout } from '@/components/ui/callout';
import { FragmentType, graphql, useFragment } from '@/gql';
import * as styles from './ProPlanBillingWarm.css';

const ProPlanBilling_OrganizationFragment = graphql(`
  fragment ProPlanBilling_OrganizationFragment on Organization {
    id
    billingConfiguration {
      hasPaymentIssues
    }
  }
`);

export function ProPlanBilling(props: {
  organization: FragmentType<typeof ProPlanBilling_OrganizationFragment>;
}): ReactElement | null {
  const organization = useFragment(ProPlanBilling_OrganizationFragment, props.organization);
  if (organization?.billingConfiguration?.hasPaymentIssues) {
    return (
      <Callout type="warning" className={styles.proPlanBillingCallout}>
        <b>Your organization has a rejected payment!</b>
        <br />
        Please review your recent invoices and update your payment method.
      </Callout>
    );
  }

  return null;
}
