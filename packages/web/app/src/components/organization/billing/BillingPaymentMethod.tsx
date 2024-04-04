import { ReactElement } from 'react';
import { useRouter } from 'next/router';
import clsx from 'clsx';
import { useMutation } from 'urql';
import { Section } from '@/components/common';
import { Button, Heading, Link } from '@/components/v2';
import { FragmentType, graphql, useFragment } from '@/gql';
import { BillingPlanType } from '@/gql/graphql';
import { ExternalLinkIcon } from '@radix-ui/react-icons';
import { CardElement } from '@stripe/react-stripe-js';

const GenerateStripeLinkMutation = graphql(`
  mutation GenerateStripeLinkMutation($selector: OrganizationSelectorInput!) {
    generateStripePortalLink(selector: $selector)
  }
`);

const BillingPaymentMethod_OrganizationFragment = graphql(`
  fragment BillingPaymentMethod_OrganizationFragment on Organization {
    id
    cleanId
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
  const router = useRouter();
  const organization = useFragment(BillingPaymentMethod_OrganizationFragment, props.organization);
  const info = organization.billingConfiguration.paymentMethod;

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
          To manage or change your payment method, billing settings, billing email, Tax ID, you can
          use the Stripe customer dashboard:
          <br />
          <Button
            variant="primary"
            onClick={() => {
              void mutate({
                selector: {
                  organization: organization.cleanId,
                },
              }).then(result => {
                if (result.data?.generateStripePortalLink) {
                  void router.push(result.data.generateStripePortalLink);
                }
              });
            }}
          >
            {mutation.fetching ? (
              'Loading...'
            ) : (
              <div className="flex items-center">
                <ExternalLinkIcon className="mr-1" /> Stripe Billing Dashboard
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
  className,
}: {
  className?: string;
  onValidationChange?: (isValid: boolean) => void;
}): ReactElement | null => {
  return (
    <div className={clsx('flex flex-col gap-6', className)}>
      <Heading>Payment Method</Heading>
      <CardElement
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
              color: '#fff',
            },
          },
        }}
      />
      <Section.Subtitle>
        All payments and subscriptions are processed securely by{' '}
        <Link variant="primary" href="https://stripe.com" target="_blank" rel="noreferrer">
          Stripe
        </Link>
      </Section.Subtitle>
    </div>
  );
};
