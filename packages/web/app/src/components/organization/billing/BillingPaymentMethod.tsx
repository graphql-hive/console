import { ReactElement, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useMutation } from 'urql';
import { Button } from '@/components/base/button/button';
import { Card } from '@/components/base/card/card';
import { Section } from '@/components/common';
import { Heading } from '@/components/ui/heading';
import { Link } from '@/components/ui/link';
import { FragmentType, graphql, useFragment } from '@/gql';
import { BillingPlanType } from '@/gql/graphql';
import { useResolvedColors } from '@/lib/utils';
import { CardElement as StripeCardElement } from '@stripe/react-stripe-js';

const GenerateStripeLinkMutation = graphql(`
  mutation GenerateStripeLinkMutation($selector: OrganizationSelectorInput!) {
    generateStripePortalLink(selector: $selector)
  }
`);

const BillingPaymentMethod_OrganizationFragment = graphql(`
  fragment BillingPaymentMethod_OrganizationFragment on Organization {
    id
    slug
    billingConfiguration {
      hasPaymentIssues
      paymentMethod {
        brand
        last4
        expMonth
        expYear
      }
    }
  }
`);

export const ManagePaymentMethod = (props: {
  organization: FragmentType<typeof BillingPaymentMethod_OrganizationFragment>;
  plan: BillingPlanType;
}) => {
  const [mutation, mutate] = useMutation(GenerateStripeLinkMutation);
  const organization = useFragment(BillingPaymentMethod_OrganizationFragment, props.organization);
  const info = organization.billingConfiguration.paymentMethod;

  /**
   * The mutation loads only the url, then the page tries to redirect. If the user has a slow connection,
   * then the button shows that the page is loading and then it resets to normal. Tracking "loading" as a
   * state lets us show that the page is loading during the entire duration of the url generation + redirect.
   */
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  if (!info) {
    return null;
  }

  return (
    <>
      <div className="mt-4">
        <div>
          <Section.BigTitle>Payment Method and Billing Settings</Section.BigTitle>
          <Section.Subtitle className="mb-6">
            Your current payment method is <strong>{info.brand.toUpperCase()}</strong> ending with{' '}
            {info.last4} (expires {info.expMonth}/{info.expYear}).
          </Section.Subtitle>
        </div>
        <div>
          <p className="pb-4">
            To manage or change your payment method, billing settings, billing email, Tax ID, you
            can use the Stripe customer dashboard:
          </p>
          <Button
            variant="primary"
            disabled={mutation.fetching || loadingDashboard}
            onClick={() => {
              setLoadingDashboard(true);
              void mutate({
                selector: {
                  organizationSlug: organization.slug,
                },
              })
                .then(result => {
                  if (result.data?.generateStripePortalLink) {
                    window.location.href = result.data.generateStripePortalLink;
                  }
                })
                .catch(() => {
                  setLoadingDashboard(false);
                });
            }}
          >
            {mutation.fetching || loadingDashboard ? (
              'Loading...'
            ) : (
              <div className="flex items-center">
                <ExternalLink className="mr-1 size-4" /> Stripe Billing Dashboard
              </div>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export const BillingPaymentMethodForm = ({
  onValidationChange,
}: {
  onValidationChange?: (isValid: boolean) => void;
}): ReactElement | null => {
  // Stripe renders the card field in its own iframe, so it needs concrete colors, not CSS vars.
  const colors = useResolvedColors();

  return (
    <div className="w-1/2">
      <Card variants={{ onSurface: 'raised' }}>
        <div className="flex flex-col gap-6">
          <Heading>Payment Method</Heading>
          <StripeCardElement
            className="grow"
            onChange={e => {
              if (e.error || !e.complete) {
                onValidationChange?.(false);
              } else {
                onValidationChange?.(true);
              }
            }}
            options={{
              style: {
                base: {
                  color: colors.fg,
                  '::placeholder': { color: colors.fgMuted },
                },
                invalid: { color: colors.critical },
              },
            }}
          />
          <Section.Subtitle>
            All payments and subscriptions are processed securely by{' '}
            <Link
              as="a"
              variant="primary"
              href="https://stripe.com"
              target="_blank"
              rel="noreferrer"
            >
              Stripe
            </Link>
          </Section.Subtitle>
        </div>
      </Card>
    </div>
  );
};
