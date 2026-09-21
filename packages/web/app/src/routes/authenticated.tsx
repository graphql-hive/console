import { z } from 'zod';
import { authenticated } from '@/components/authenticated-container';
import { DevPage } from '@/pages/dev';
import { IndexPage } from '@/pages/index';
import { ManagePage } from '@/pages/manage';
import { NativeCompositionDiff } from '@/pages/native-composition-diff';
import { NewOrgPage } from '@/pages/organization-new';
import { OrganizationOIDCRequestPage } from '@/pages/organization-oidc-request';
import { OrganizationTransferPage } from '@/pages/organization-transfer';
import { createRoute, Outlet } from '@tanstack/react-router';
import { root } from './root';

export const authenticatedRoute = createRoute({
  getParentRoute: () => root,
  id: 'authenticated',
  component: authenticated(function AuthenticatedRoute() {
    return <Outlet />;
  }),
});

export const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: IndexPage,
});

export const devRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'dev',
  component: DevPage,
});

export const nativeCompositionDiffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'native-composition-compatibility-report/$projectId',
  component: function NativeCompositionDiffRoute() {
    const { projectId } = nativeCompositionDiffRoute.useParams();
    return <NativeCompositionDiff projectId={projectId} />;
  },
});

export const newOrgPage = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'org/new',
  component: NewOrgPage,
});

export const manageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'manage',
  component: ManagePage,
});

export const transferOrganizationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'action/transfer/$organizationSlug/$code',
  component: function TransferOrganizationRoute() {
    const { organizationSlug, code } = transferOrganizationRoute.useParams();
    return <OrganizationTransferPage organizationSlug={organizationSlug} code={code} />;
  },
});

const OrganizationOIDCRequestRouteSearch = z.object({
  id: z.string({ required_error: 'OIDC ID is required' }),
  redirectToPath: z.string().optional().default('/'),
});
export const organizationOIDCRequestRoute = createRoute({
  // An auth interstitial, not an organization page: it renders its own minimal chrome.
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/oidc-request',
  validateSearch(search) {
    return OrganizationOIDCRequestRouteSearch.parse(search);
  },
  component: function OrganizationOIDCRequestRoute() {
    const { organizationSlug } = organizationOIDCRequestRoute.useParams();
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
