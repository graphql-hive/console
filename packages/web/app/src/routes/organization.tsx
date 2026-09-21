import { useCallback } from 'react';
import { z } from 'zod';
import { OrganizationIndexRouteSearch, OrganizationPage } from '@/pages/organization';
import { OrganizationMembersPage } from '@/pages/organization-members';
import { OrganizationOIDCRequestPage } from '@/pages/organization-oidc-request';
import {
  OrganizationSettingsPage,
  OrganizationSettingsPageEnum,
} from '@/pages/organization-settings';
import { OrganizationSubscriptionPage } from '@/pages/organization-subscription';
import { OrganizationSubscriptionManagePage } from '@/pages/organization-subscription-manage';
import { OrganizationSupportPage } from '@/pages/organization-support';
import { OrganizationSupportTicketPage } from '@/pages/organization-support-ticket';
import { createRoute, Navigate, useNavigate } from '@tanstack/react-router';
import { authenticatedRoute } from './authenticated';

export const organizationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug',
});

const OrganizationOIDCRequestRouteSearch = z.object({
  id: z.string({ required_error: 'OIDC ID is required' }),
  redirectToPath: z.string().optional().default('/'),
});
export const organizationOIDCRequestRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'oidc-request',
  validateSearch(search) {
    return OrganizationOIDCRequestRouteSearch.parse(search);
  },
  component: function OrganizationOIDCRequestRoute() {
    const { organizationSlug } = organizationRoute.useParams();
    const { id, redirectToPath } = organizationOIDCRequestRoute.useSearch();
    return (
      <OrganizationOIDCRequestPage
        organizationSlug={organizationSlug}
        oidcId={id}
        redirectToPath={redirectToPath}
      />
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

export const organizationSubscriptionManageLegacyRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/subscription/manage',
  component: function OrganizationSubscriptionManageLegacyRoute() {
    const { organizationSlug } = organizationSubscriptionManageLegacyRoute.useParams();
    return (
      <Navigate to="/$organizationSlug/view/manage-subscription" params={{ organizationSlug }} />
    );
  },
});

export const organizationSubscriptionManageRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/manage-subscription',
  component: function OrganizationSubscriptionManageRoute() {
    const { organizationSlug } = organizationSubscriptionManageRoute.useParams();
    return <OrganizationSubscriptionManagePage organizationSlug={organizationSlug} />;
  },
});

const OrganizationSettingRouteSearch = z.object({
  page: OrganizationSettingsPageEnum.default('general').optional(),
});

export const organizationSettingsRoute = createRoute({
  getParentRoute: () => organizationRoute,
  validateSearch(search) {
    return OrganizationSettingRouteSearch.parse(search);
  },
  path: 'view/settings',
  component: function OrganizationSettingsRoute() {
    const { organizationSlug } = organizationSettingsRoute.useParams();
    const { page } = organizationSettingsRoute.useSearch();
    return <OrganizationSettingsPage organizationSlug={organizationSlug} page={page} />;
  },
});

const OrganizationMembersRouteSearch = z.object({
  page: z.enum(['list', 'roles', 'invitations', 'groups']).catch('list').default('list'),
  search: z.string().optional(),
  showPendingSCIMManagementConfirmations: z.boolean().optional(),
});

export const organizationMembersRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/members',
  validateSearch(search) {
    return OrganizationMembersRouteSearch.parse(search);
  },
  component: function OrganizationMembersRoute() {
    const { organizationSlug } = organizationMembersRoute.useParams();
    const { page } = organizationMembersRoute.useSearch();
    const navigate = useNavigate({ from: organizationMembersRoute.fullPath });
    const onPageChange = useCallback(
      (newPage: z.infer<typeof OrganizationMembersRouteSearch>['page']) => {
        void navigate({ search: { page: newPage, search: undefined } });
      },
      [navigate],
    );

    return (
      <OrganizationMembersPage
        organizationSlug={organizationSlug}
        page={page}
        onPageChange={onPageChange}
      />
    );
  },
});
