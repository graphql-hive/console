// @vitest-environment jsdom
import { BillingPlanType } from '@/gql/graphql';
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { retentionNote, RetentionNoteView } from './retention-note';

// The connected note reads the Stripe key from the env; jsdom has none.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));

function renderInRouter(element: React.ReactNode) {
  const root = createRootRoute({ component: () => <>{element}</> });
  const router = createRouter({
    routeTree: root,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  });
  return render(<RouterProvider router={router as never} />);
}

const hobby = { slug: 'the-guild', plan: BillingPlanType.Hobby, viewerCanDescribeBilling: true };

describe('retentionNote', () => {
  it('links the upgrade for a viewer who may see billing, and only tells the others', () => {
    expect(retentionNote(hobby, true)).toEqual({
      plan: BillingPlanType.Hobby,
      upgrade: { organizationSlug: 'the-guild' },
    });
    expect(retentionNote({ ...hobby, viewerCanDescribeBilling: false }, true)).toEqual({
      plan: BillingPlanType.Hobby,
      upgrade: undefined,
    });
  });

  it('has nothing to say on Enterprise, without Stripe, or before the layout loaded', () => {
    expect(retentionNote({ ...hobby, plan: BillingPlanType.Enterprise }, true)).toBeNull();
    expect(retentionNote(hobby, false)).toBeNull();
    expect(retentionNote(undefined, true)).toBeNull();
  });
});

describe('RetentionNoteView', () => {
  it('names the plan, the days and the subject, and links the manage page', async () => {
    renderInRouter(
      <RetentionNoteView
        plan={BillingPlanType.Pro}
        retentionInDays={90}
        subject="usage data"
        upgrade={{ organizationSlug: 'the-guild' }}
      />,
    );

    expect(
      (await screen.findByText(/Your Pro plan keeps the last 90 days of usage data\./)).textContent,
    ).toContain('Upgrade for longer retention');
    expect(
      screen.getByRole('link', { name: 'Upgrade for longer retention' }).getAttribute('href'),
    ).toBe('/the-guild/view/subscription/manage');
  });

  it('is the sentence alone without an upgrade', async () => {
    renderInRouter(
      <RetentionNoteView
        plan={BillingPlanType.Hobby}
        retentionInDays={7}
        subject="alert activity"
      />,
    );

    expect(
      await screen.findByText('Your Hobby plan keeps the last 7 days of alert activity.'),
    ).toBeTruthy();
    expect(screen.queryByRole('link')).toBeNull();
  });
});
