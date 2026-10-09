// @vitest-environment jsdom
import { OrganizationLayoutQuery } from '@/components/layouts/queries';
import { organizationLayout, SLUGS } from '@/lib/testing/fixtures/layouts';
import { createTestClient } from '@/lib/testing/urql';

// The page imports what cannot load under jsdom; these stand in.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

const slug = { organizationSlug: SLUGS.organizationSlug };

function downgraded() {
  return {
    __typename: 'Mutation',
    downgradeToHobby: {
      __typename: 'ChangePlanResult',
      previousPlan: 'PRO',
      newPlan: 'HOBBY',
      organization: {
        __typename: 'Organization',
        id: 'organization-1',
        slug: SLUGS.organizationSlug,
        viewerCanModifyBilling: true,
        billingConfiguration: {
          __typename: 'BillingConfiguration',
          hasPaymentIssues: false,
          canUpdateSubscription: true,
          paymentMethod: null,
        },
        plan: 'HOBBY',
        usageRetentionInDays: 7,
        monthlyOperationsLimit: 1_000_000,
      },
    },
  };
}

describe('a plan change', () => {
  it('updates the retention every cached document reads', { timeout: 30_000 }, async () => {
    const { BillingDowngradeMutation } = await import('./organization-subscription-manage');
    const client = createTestClient(
      new Map<string, unknown>([
        ['OrganizationLayoutQuery', organizationLayout({ usageRetentionInDays: 90, plan: 'PRO' })],
        ['ManageSubscription_DowngradeToHobby', downgraded()],
      ]),
    );
    const layout = () =>
      client.query(OrganizationLayoutQuery, slug, { requestPolicy: 'cache-only' }).toPromise();

    await client.query(OrganizationLayoutQuery, slug).toPromise();
    expect((await layout()).data?.organizationBySlug?.usageRetentionInDays).toBe(90);

    await client.mutation(BillingDowngradeMutation, slug).toPromise();

    expect((await layout()).data?.organizationBySlug?.usageRetentionInDays).toBe(7);
  });
});
