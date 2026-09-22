import { OrganizationLayout } from '@/components/layouts/organization';
import { OrganizationIndexRouteSearch, OrganizationPage } from '@/pages/organization';
import { OrganizationSubscriptionPage } from '@/pages/organization-subscription';
import { OrganizationSubscriptionManagePage } from '@/pages/organization-subscription-manage';
import { OrganizationSupportPage } from '@/pages/organization-support';
import { OrganizationSupportTicketPage } from '@/pages/organization-support-ticket';
import { createRoute, Outlet } from '@tanstack/react-router';
import { authenticatedRoute } from '../authenticated';

export const organizationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug',
  component: function OrganizationRoute() {
    const { organizationSlug } = organizationRoute.useParams();
    return (
      <OrganizationLayout organizationSlug={organizationSlug}>
        <Outlet />
      </OrganizationLayout>
    );
  },
});

export const organizationIndexRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: '/',
  validateSearch: OrganizationIndexRouteSearch.parse,
  component: function OrganizationRoute() {
    const { organizationSlug } = organizationRoute.useParams();
    const { search, sortBy, sortOrder } = organizationIndexRoute.useSearch();
    return (
      <OrganizationPage
        organizationSlug={organizationSlug}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    );
  },
});

export const organizationSupportRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/support',
  component: function OrganizationSupportRoute() {
    const { organizationSlug } = organizationSupportRoute.useParams();
    return <OrganizationSupportPage organizationSlug={organizationSlug} />;
  },
});

export const organizationSupportTicketRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/support/ticket/$ticketId',
  component: function OrganizationSupportTicketRoute() {
    const { organizationSlug, ticketId } = organizationSupportTicketRoute.useParams();
    return (
      <OrganizationSupportTicketPage organizationSlug={organizationSlug} ticketId={ticketId} />
    );
  },
});

export const organizationSubscriptionRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/subscription',
  component: function OrganizationSubscriptionRoute() {
    const { organizationSlug } = organizationSubscriptionRoute.useParams();
    return <OrganizationSubscriptionPage organizationSlug={organizationSlug} />;
  },
});

export const organizationSubscriptionManageRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/subscription/manage',
  component: function OrganizationSubscriptionManageRoute() {
    const { organizationSlug } = organizationSubscriptionManageRoute.useParams();
    return <OrganizationSubscriptionManagePage organizationSlug={organizationSlug} />;
  },
});
