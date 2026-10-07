import { Link } from '@/components/ui/link';
import { Text } from '@/components/ui/text';
import { BillingPlanType } from '@/gql/graphql';
import { getIsStripeEnabled } from '@/lib/billing/stripe-public-key';
import { useLayoutQuery } from '@/lib/hooks/use-layout-query';

const planLabel: Record<BillingPlanType, string> = {
  [BillingPlanType.Hobby]: 'Hobby',
  [BillingPlanType.Pro]: 'Pro',
  [BillingPlanType.Enterprise]: 'Enterprise',
};

export type RetentionNoteProps = {
  plan: BillingPlanType;
  retentionInDays: number;
  /** what the retention keeps: "usage data", "alert activity" */
  subject: string;
  /** the organization to upgrade; only viewers who may see billing get the link */
  upgrade?: { organizationSlug: string };
};

export function RetentionNoteView({ plan, retentionInDays, subject, upgrade }: RetentionNoteProps) {
  return (
    <Text as="p" size="x-small" color="secondary">
      Your {planLabel[plan]} plan keeps the last {retentionInDays} days of {subject}.
      {upgrade ? (
        <>
          {' '}
          <Link
            to="/$organizationSlug/view/subscription/manage"
            params={{ organizationSlug: upgrade.organizationSlug }}
          >
            Upgrade for longer retention
          </Link>
        </>
      ) : null}
    </Text>
  );
}

// Nothing on Enterprise, which has nothing to upgrade to, and nothing without Stripe, where no plan is sold.
export function retentionNote(
  organization:
    | { slug: string; plan: BillingPlanType; viewerCanDescribeBilling: boolean }
    | null
    | undefined,
  stripeEnabled: boolean,
): Pick<RetentionNoteProps, 'plan' | 'upgrade'> | null {
  if (!organization || !stripeEnabled || organization.plan === BillingPlanType.Enterprise) {
    return null;
  }
  return {
    plan: organization.plan,
    upgrade: organization.viewerCanDescribeBilling
      ? { organizationSlug: organization.slug }
      : undefined,
  };
}

/** The picker's footer on a page under a target: what the plan keeps, and where to get more. */
export function RetentionNote(props: Pick<RetentionNoteProps, 'retentionInDays' | 'subject'>) {
  const layout = useLayoutQuery('target');
  const note = retentionNote(layout.data?.organization, getIsStripeEnabled());
  return note ? <RetentionNoteView {...note} {...props} /> : null;
}
