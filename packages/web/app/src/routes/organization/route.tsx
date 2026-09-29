import { OrganizationLayout } from '@/components/layouts/organization';
import { OrganizationLayoutQuery } from '@/components/layouts/queries';
import { getIsStripeEnabled } from '@/lib/billing/stripe-public-key';
import { overviewPeriod } from '@/lib/overview-period';
import { loadQuery, revalidate } from '@/lib/route-utils';
import {
  OrganizationIndexRouteSearch,
  OrganizationPage,
  OrganizationProjectsPageQuery,
} from '@/pages/organization';
import {
  OrganizationSubscriptionPage,
  SubscriptionPageQuery,
} from '@/pages/organization-subscription';
import {
  BillingsPlanQuery,
  ManageSubscriptionPageQuery,
  OrganizationSubscriptionManagePage,
} from '@/pages/organization-subscription-manage';
import { OrganizationSupportPage, SupportPageQuery } from '@/pages/organization-support';
import {
  OrganizationSupportTicketPage,
  SupportTicketPageQuery,
} from '@/pages/organization-support-ticket';
import { createRoute, Outlet, redirect } from '@tanstack/react-router';
import { withHeaderRoute } from '../with-header';

// Billing pages exist only where Stripe is configured; elsewhere they are the organization.
function requireStripe({ params }: { params: { organizationSlug: string } }) {
  if (!getIsStripeEnabled()) {
    throw redirect({
      to: '/$organizationSlug',
      params: { organizationSlug: params.organizationSlug },
    });
  }
}

export const organizationRoute = createRoute({
  getParentRoute: () => withHeaderRoute,
  path: '$organizationSlug',
  loader: loader => {
    const { organizationSlug } = loader.params;
    void loadQuery(loader, OrganizationLayoutQuery, { organizationSlug });
  },
  component: function OrganizationRoute() {
    return (
      <OrganizationLayout>
        <Outlet />
      </OrganizationLayout>
    );
  },
});

export const organizationIndexRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: '/',
  validateSearch: OrganizationIndexRouteSearch.parse,
  preloadStaleTime: 0,
  loader: loader => {
    const { organizationSlug } = loader.params;
    const { period, resolution } = overviewPeriod();
    void loadQuery(
      loader,
      OrganizationProjectsPageQuery,
      { organizationSlug, chartResolution: resolution, period },
      revalidate(loader),
    );
    return { period, resolution };
  },
  component: function OrganizationRoute() {
    const { search, sortBy, sortOrder } = organizationIndexRoute.useSearch();
    return <OrganizationPage search={search} sortBy={sortBy} sortOrder={sortOrder} />;
  },
});

export const organizationSupportRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/support',
  loader: loader => {
    const { organizationSlug } = loader.params;
    void loadQuery(loader, SupportPageQuery, { organizationSlug });
  },
  component: OrganizationSupportPage,
});

export const organizationSupportTicketRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/support/ticket/$ticketId',
  loader: loader => {
    const { organizationSlug, ticketId } = loader.params;
    void loadQuery(loader, SupportTicketPageQuery, { organizationSlug, ticketId });
  },
  component: function OrganizationSupportTicketRoute() {
    const { ticketId } = organizationSupportTicketRoute.useParams();
    return <OrganizationSupportTicketPage ticketId={ticketId} />;
  },
});

export const organizationSubscriptionRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/subscription',
  beforeLoad: requireStripe,
  loader: loader => {
    const { organizationSlug } = loader.params;
    void loadQuery(loader, SubscriptionPageQuery, { organizationSlug });
  },
  component: OrganizationSubscriptionPage,
});

export const organizationSubscriptionManageRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/subscription/manage',
  beforeLoad: requireStripe,
  loader: loader => {
    const { organizationSlug } = loader.params;
    void loadQuery(loader, ManageSubscriptionPageQuery, { organizationSlug });
    void loadQuery(loader, BillingsPlanQuery, {});
  },
  component: OrganizationSubscriptionManagePage,
});
