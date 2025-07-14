import { lazy, useCallback, useEffect } from 'react';
import { parse as jsUrlParse, stringify as jsUrlStringify } from 'jsurl2';
import qs from 'query-string';
import { Helmet, HelmetProvider } from 'react-helmet-async';
import { ToastContainer } from 'react-toastify';
import SuperTokens, { SuperTokensWrapper } from 'supertokens-auth-react';
import Session from 'supertokens-auth-react/recipe/session';
import { Provider as UrqlProvider } from 'urql';
import { z } from 'zod';
import { LoadingAPIIndicator } from '@/components/common/LoadingAPI';
import { Toaster } from '@/components/ui/toaster';
import { frontendConfig } from '@/config/supertokens/frontend';
import { env } from '@/env/frontend';
import * as gtag from '@/lib/gtag';
import { urqlClient } from '@/lib/urql';
import { configureScope, init } from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
  Outlet,
  parseSearchWith,
  stringifySearchWith,
  useNavigate,
} from '@tanstack/react-router';
import { ErrorComponent } from './components/error';
import { NotFound } from './components/not-found';
import 'react-toastify/dist/ReactToastify.css';
import { zodValidator } from '@tanstack/zod-adapter';
import { authenticated } from './components/authenticated-container';
import { AuthPage } from './pages/auth';
import { AuthCallbackPage } from './pages/auth-callback';
import { AuthOIDCPage } from './pages/auth-oidc';
import { AuthResetPasswordPage } from './pages/auth-reset-password';
import { AuthSignInPage } from './pages/auth-sign-in';
import { AuthSignUpPage } from './pages/auth-sign-up';
import { AuthSSOPage } from './pages/auth-sso';
import { AuthVerifyEmailPage } from './pages/auth-verify-email';
import { DevPage } from './pages/dev';
import { IndexPage } from './pages/index';
import { LogoutPage } from './pages/logout';
import { ManagePage } from './pages/manage';
import { NativeCompositionDiff } from './pages/native-composition-diff';
import { OrganizationIndexRouteSearch, OrganizationPage } from './pages/organization';
import { JoinOrganizationPage } from './pages/organization-join';
import { OrganizationMembersPage } from './pages/organization-members';
import { NewOrgPage } from './pages/organization-new';
import { OrganizationPolicyPage } from './pages/organization-policy';
import {
  OrganizationSettingsPage,
  OrganizationSettingsPageEnum,
} from './pages/organization-settings';
import { OrganizationSubscriptionPage } from './pages/organization-subscription';
import { OrganizationSubscriptionManagePage } from './pages/organization-subscription-manage';
import { OrganizationSupportPage } from './pages/organization-support';
import { OrganizationSupportTicketPage } from './pages/organization-support-ticket';
import { OrganizationTransferPage } from './pages/organization-transfer';
import { ProjectIndexRouteSearch, ProjectPage } from './pages/project';
import { ProjectAlertsPage } from './pages/project-alerts';
import { ProjectPolicyPage } from './pages/project-policy';
import { ProjectSettingsPage } from './pages/project-settings';
import { TargetPage } from './pages/target';
import { TargetAppVersionPage } from './pages/target-app-version';
import { TargetAppsPage } from './pages/target-apps';
import { TargetChecksPage } from './pages/target-checks';
import { TargetChecksSinglePage } from './pages/target-checks-single';
import { TargetExplorerPage } from './pages/target-explorer';
import { TargetExplorerDeprecatedPage } from './pages/target-explorer-deprecated';
import { TargetExplorerTypePage } from './pages/target-explorer-type';
import { TargetExplorerUnusedPage } from './pages/target-explorer-unused';
import { TargetHistoryPage } from './pages/target-history';
import { TargetHistoryVersionPage } from './pages/target-history-version';
import { TargetInsightsPage } from './pages/target-insights';
import { TargetInsightsClientPage } from './pages/target-insights-client';
import { TargetInsightsCoordinatePage } from './pages/target-insights-coordinate';
import { TargetInsightsOperationPage } from './pages/target-insights-operation';
import { TargetLaboratoryPage } from './pages/target-laboratory';
import { TargetSettingsPage, TargetSettingsPageEnum } from './pages/target-settings';
import { TargetTracePage } from './pages/target-trace';
import {
  PaginationState,
  TargetTracesFilterState,
  TargetTracesPage,
  TargetTracesPagination,
  TargetTracesSort,
} from './pages/target-traces';

SuperTokens.init(frontendConfig());
if (env.sentry) {
  init({
    dsn: env.sentry.dsn,
    enabled: true,
    dist: 'webapp',
    release: env.release,
    environment: env.environment,
  });
}

const queryClient = new QueryClient();

const LazyTanStackRouterDevtools = lazy(() =>
  import('@tanstack/router-devtools').then(({ TanStackRouterDevtools }) => ({
    default: TanStackRouterDevtools,
  })),
);

function identifyOnSentry(userId: string, email: string): void {
  configureScope(scope => {
    scope.setUser({ id: userId, email });
  });
}

function RootComponent() {
  useEffect(() => {
    void Session.doesSessionExist().then(async doesExist => {
      if (!doesExist) {
        return;
      }
      const payload = await Session.getAccessTokenPayloadSecurely();
      identifyOnSentry(payload.superTokensUserId, payload.email);
    });
  }, []);

  return (
    <HelmetProvider>
      {env.analytics.googleAnalyticsTrackingId && (
        <Helmet>
          <script id="gtag-init" key="gtag-init" type="text/javascript">{`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${env.analytics.googleAnalyticsTrackingId}', {
              page_path: window.location.pathname,
            });
          `}</script>
          <script
            key="gtag-script"
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${env.analytics.googleAnalyticsTrackingId}`}
            type="text/javascript"
          />
        </Helmet>
      )}
      <Toaster />
      <SuperTokensWrapper>
        <QueryClientProvider client={queryClient}>
          <UrqlProvider value={urqlClient}>
            <LoadingAPIIndicator />
            <Outlet />
          </UrqlProvider>
        </QueryClientProvider>
      </SuperTokensWrapper>
      <ToastContainer hideProgressBar />
      {/* eslint-disable-next-line no-process-env */}
      {process.env.NODE_ENV === 'development' && <LazyTanStackRouterDevtools />}
    </HelmetProvider>
  );
}

const root = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFound,
});

const anonymousRoute = createRoute({
  getParentRoute: () => root,
  id: 'anonymous',
});

const authenticatedRoute = createRoute({
  getParentRoute: () => root,
  id: 'authenticated',
  component: authenticated(function AuthenticatedRoute() {
    return <Outlet />;
  }),
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

const authRoute = createRoute({
  getParentRoute: () => anonymousRoute,
  path: 'auth',
  component: AuthPage,
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

const AuthSharedSearch = z.object({
  redirectToPath: z.string().optional().default('/'),
});

const authIndexRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/',
  validateSearch(search) {
    return AuthSharedSearch.parse(search);
  },
  component: () => {
    const { redirectToPath } = authIndexRoute.useSearch();
    return <Navigate to="/auth/sign-in" search={{ redirectToPath }} />;
  },
});

const AuthResetPasswordRouteSearch = AuthSharedSearch.extend({
  email: z.string().optional(),
  token: z.string().optional(),
});

const authResetPasswordRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'reset-password',
  validateSearch: AuthResetPasswordRouteSearch.parse,
  component: function AuthResetPasswordRoute() {
    const { email, token, redirectToPath } = authResetPasswordRoute.useSearch();
    return (
      <AuthResetPasswordPage
        email={email ?? null}
        token={token ?? null}
        redirectToPath={redirectToPath}
      />
    );
  },
});

const authSignInRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'sign-in',
  validateSearch(search) {
    return AuthSharedSearch.parse(search);
  },
  component: () => {
    const { redirectToPath } = authSignInRoute.useSearch();
    return <AuthSignInPage redirectToPath={redirectToPath} />;
  },
});

const authSSORoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'sso',
  validateSearch(search) {
    return AuthSharedSearch.parse(search);
  },
  component: () => {
    const { redirectToPath } = authSSORoute.useSearch();
    return <AuthSSOPage redirectToPath={redirectToPath} />;
  },
});

const AuthOIDCRouteSearch = AuthSharedSearch.extend({
  id: z
    .string({
      required_error: 'OIDC ID is required',
    })
    .optional(),
});
const authOIDCRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'oidc',
  validateSearch(search) {
    return AuthOIDCRouteSearch.parse(search);
  },
  component: function AuthOIDCRoute() {
    const { id, redirectToPath } = authOIDCRoute.useSearch();
    return <AuthOIDCPage oidcId={id} redirectToPath={redirectToPath} />;
  },
});

const AuthCallbackRouteParams = z.object({
  provider: z.enum(['oidc', 'okta', 'github', 'google']),
});
const authCallbackRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'callback/$provider',
  validateSearch(search) {
    return AuthSharedSearch.parse(search);
  },
  component() {
    const { redirectToPath } = authCallbackRoute.useSearch();
    const params = authCallbackRoute.useParams();
    const { provider } = AuthCallbackRouteParams.parse(params);
    return AuthCallbackPage({ provider, redirectToPath });
  },
});

const authSignUpRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'sign-up',
  component: AuthSignUpPage,
});

const authVerifyEmailRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'verify-email',
  component: AuthVerifyEmailPage,
});

const indexRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '/',
  component: IndexPage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => root,
  path: '404',
  component: NotFound,
});

const devRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'dev',
  component: DevPage,
});

const nativeCompositionDiffRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'native-composition-compatibility-report/$projectId',
  component: function NativeCompositionDiffRoute() {
    const { projectId } = nativeCompositionDiffRoute.useParams();
    return <NativeCompositionDiff projectId={projectId} />;
  },
});

const newOrgPage = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'org/new',
  component: NewOrgPage,
});

const logoutRoute = createRoute({
  getParentRoute: () => root,
  path: 'logout',
  component: LogoutPage,
});

const manageRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'manage',
  component: ManagePage,
});

const joinOrganizationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'join/$inviteCode',
  component: function JoinOrganizationRoute() {
    const { inviteCode } = joinOrganizationRoute.useParams();
    return <JoinOrganizationPage inviteCode={inviteCode} />;
  },
});

const transferOrganizationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: 'action/transfer/$organizationSlug/$code',
  component: function TransferOrganizationRoute() {
    const { organizationSlug, code } = transferOrganizationRoute.useParams();
    return <OrganizationTransferPage organizationSlug={organizationSlug} code={code} />;
  },
});

const organizationRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug',
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

const organizationIndexRoute = createRoute({
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
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

const organizationSupportRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/support',
  component: function OrganizationSupportRoute() {
    const { organizationSlug } = organizationSupportRoute.useParams();
    return <OrganizationSupportPage organizationSlug={organizationSlug} />;
  },
});

const organizationSupportTicketRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/support/ticket/$ticketId',
  component: function OrganizationSupportTicketRoute() {
    const { organizationSlug, ticketId } = organizationSupportTicketRoute.useParams();
    return (
      <OrganizationSupportTicketPage organizationSlug={organizationSlug} ticketId={ticketId} />
    );
  },
});

const organizationSubscriptionRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/subscription',
  component: function OrganizationSubscriptionRoute() {
    const { organizationSlug } = organizationSubscriptionRoute.useParams();
    return <OrganizationSubscriptionPage organizationSlug={organizationSlug} />;
  },
});

const organizationSubscriptionManageLegacyRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/subscription/manage',
  component: function OrganizationSubscriptionManageLegacyRoute() {
    const { organizationSlug } = organizationSubscriptionManageLegacyRoute.useParams();
    return (
      <Navigate to="/$organizationSlug/view/manage-subscription" params={{ organizationSlug }} />
    );
  },
});

const organizationSubscriptionManageRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/manage-subscription',
  component: function OrganizationSubscriptionManageRoute() {
    const { organizationSlug } = organizationSubscriptionManageRoute.useParams();
    return <OrganizationSubscriptionManagePage organizationSlug={organizationSlug} />;
  },
});

const organizationPolicyRoute = createRoute({
  getParentRoute: () => organizationRoute,
  path: 'view/policy',
  component: function OrganizationPolicyRoute() {
    const { organizationSlug } = organizationPolicyRoute.useParams();
    return <OrganizationPolicyPage organizationSlug={organizationSlug} />;
  },
});

const OrganizationSettingRouteSearch = z.object({
  page: OrganizationSettingsPageEnum.default('general').optional(),
});

const organizationSettingsRoute = createRoute({
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
  page: z.enum(['list', 'roles', 'invitations']).catch('list').default('list'),
});

const organizationMembersRoute = createRoute({
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
        void navigate({ search: { page: newPage } });
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

const projectRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug',
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

const projectIndexRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: '/',
  validateSearch: ProjectIndexRouteSearch.parse,
  component: function ProjectRoute() {
    const { organizationSlug, projectSlug } = projectIndexRoute.useParams();
    const { search, sortBy, sortOrder } = projectIndexRoute.useSearch();
    return (
      <ProjectPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        search={search}
        sortBy={sortBy}
        sortOrder={sortOrder}
      />
    );
  },
});

const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/settings',
  component: function ProjectSettingsRoute() {
    const { organizationSlug, projectSlug } = projectSettingsRoute.useParams();
    return <ProjectSettingsPage organizationSlug={organizationSlug} projectSlug={projectSlug} />;
  },
});

const projectPolicyRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/policy',
  component: function ProjectPolicyRoute() {
    const { organizationSlug, projectSlug } = projectPolicyRoute.useParams();
    return <ProjectPolicyPage organizationSlug={organizationSlug} projectSlug={projectSlug} />;
  },
});

const projectAlertsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: 'view/alerts',
  component: function ProjectAlertsRoute() {
    const { organizationSlug, projectSlug } = projectAlertsRoute.useParams();
    return <ProjectAlertsPage organizationSlug={organizationSlug} projectSlug={projectSlug} />;
  },
});

const targetRoute = createRoute({
  getParentRoute: () => authenticatedRoute,
  path: '$organizationSlug/$projectSlug/$targetSlug',
  notFoundComponent: NotFound,
  errorComponent: ErrorComponent,
});

const targetIndexRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: '/',
  component: function TargetRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetIndexRoute.useParams();
    return (
      <TargetPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const TargetSettingRouteSearch = z.object({
  page: TargetSettingsPageEnum.default('general').optional(),
});

const targetSettingsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'settings',
  validateSearch(search) {
    return TargetSettingRouteSearch.parse(search);
  },
  component: function TargetSettingsRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetSettingsRoute.useParams();
    const { page } = targetSettingsRoute.useSearch();

    return (
      <TargetSettingsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        page={page}
      />
    );
  },
});

const targetLaboratoryRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'laboratory',
  validateSearch: () => ({}) as { operation?: string; operationString?: string },
  component: function TargetLaboratoryRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetLaboratoryRoute.useParams();
    const { operation } = targetLaboratoryRoute.useSearch();
    return (
      <TargetLaboratoryPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        selectedOperationId={operation}
      />
    );
  },
});

const targetAppsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'apps',
  component: function TargetAppsRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetAppsRoute.useParams();
    return (
      <TargetAppsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const targetAppVersionRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'apps/$appName/$appVersion',
  component: function TargetAppVersionRoute() {
    const { organizationSlug, projectSlug, targetSlug, appName, appVersion } =
      targetAppVersionRoute.useParams();
    return (
      <TargetAppVersionPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        appName={appName}
        appVersion={appVersion}
      />
    );
  },
});

const targetInsightsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights',
  component: function TargetInsightsRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetInsightsRoute.useParams();
    return (
      <TargetInsightsPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const TargetTracesRouteSearch = z.object({
  filter: TargetTracesFilterState.optional(),
  sort: TargetTracesSort.shape.optional(),
  pagination: TargetTracesPagination.shape.optional(),
});

const targetTracesRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'traces',
  validateSearch: TargetTracesRouteSearch.parse,
  component: function TargetTracesRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetTracesRoute.useParams();
    const {
      filter = {},
      sort = [],
      pagination = {
        pageIndex: 0,
        pageSize: 20,
      } satisfies PaginationState,
    } = targetTracesRoute.useSearch();

    return (
      <TargetTracesPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        sorting={sort}
        pagination={pagination}
        filter={filter as any}
      />
    );
  },
});

const TargetTraceRouteSearchModel = z.object({
  activeSpanId: z.string().optional(),
  activeSpanTab: z.string().optional(),
});

const targetTraceRoute = createRoute({
  getParentRoute: () => targetRoute,
  validateSearch(search) {
    return TargetTraceRouteSearchModel.parse(search);
  },
  path: 'trace/$traceId',
  component: function TargetTraceRoute() {
    const { organizationSlug, projectSlug, targetSlug, traceId } = targetTraceRoute.useParams();
    const { activeSpanId, activeSpanTab } = targetTraceRoute.useSearch();
    return (
      <TargetTracePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        traceId={traceId}
        activeSpanId={activeSpanId ?? null}
        activeSpanTab={activeSpanTab ?? null}
      />
    );
  },
});

const targetInsightsCoordinateRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights/schema-coordinate/$coordinate',
  component: function TargetInsightsRoute() {
    const { organizationSlug, projectSlug, targetSlug, coordinate } =
      targetInsightsCoordinateRoute.useParams();
    return (
      <TargetInsightsCoordinatePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        coordinate={coordinate}
      />
    );
  },
});

const targetInsightsClientRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights/client/$name',
  component: function TargetInsightsRoute() {
    const { organizationSlug, projectSlug, targetSlug, name } =
      targetInsightsClientRoute.useParams();
    return (
      <TargetInsightsClientPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        name={name}
      />
    );
  },
});

const targetInsightsOperationsRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'insights/$operationName/$operationHash',
  component: function TargetInsightsRoute() {
    const { organizationSlug, projectSlug, targetSlug, operationName, operationHash } =
      targetInsightsOperationsRoute.useParams();
    return (
      <TargetInsightsOperationPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        operationName={operationName}
        operationHash={operationHash}
      />
    );
  },
});

const targetHistoryRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'history',
  component: function TargetHistoryRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetHistoryRoute.useParams();
    return (
      <TargetHistoryPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const targetHistoryVersionRoute = createRoute({
  getParentRoute: () => targetHistoryRoute,
  path: '$versionId',
  component: function TargetHistoryVersionRoute() {
    const { organizationSlug, projectSlug, targetSlug, versionId } =
      targetHistoryVersionRoute.useParams();
    return (
      <TargetHistoryVersionPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        versionId={versionId}
      />
    );
  },
});

const targetExplorerRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer',
  component: function TargetExplorerRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetExplorerRoute.useParams();
    return (
      <TargetExplorerPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const targetExplorerTypeRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/$typename',
  component: function TargetExplorerTypeRoute() {
    const { organizationSlug, projectSlug, targetSlug, typename } =
      targetExplorerTypeRoute.useParams();
    return (
      <TargetExplorerTypePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        typename={typename}
      />
    );
  },
});

const targetExplorerDeprecatedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/deprecated',
  component: function TargetExplorerDeprecatedRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetExplorerDeprecatedRoute.useParams();
    return (
      <TargetExplorerDeprecatedPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const targetExplorerUnusedRoute = createRoute({
  getParentRoute: () => targetRoute,
  path: 'explorer/unused',
  component: function TargetExplorerUnusedRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetExplorerUnusedRoute.useParams();
    return (
      <TargetExplorerUnusedPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const targetChecksRoute = createRoute({
  validateSearch: zodValidator(
    z.object({
      filter_changed: z.boolean().default(false),
      filter_failed: z.boolean().default(false),
    }),
  ),
  getParentRoute: () => targetRoute,
  path: 'checks',
  component: function TargetChecksRoute() {
    const { organizationSlug, projectSlug, targetSlug } = targetChecksRoute.useParams();
    return (
      <TargetChecksPage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
      />
    );
  },
});

const targetChecksSingleRoute = createRoute({
  getParentRoute: () => targetChecksRoute,
  path: '$schemaCheckId',
  component: function TargetChecksSingleRoute() {
    const { organizationSlug, projectSlug, targetSlug, schemaCheckId } =
      targetChecksSingleRoute.useParams();
    return (
      <TargetChecksSinglePage
        organizationSlug={organizationSlug}
        projectSlug={projectSlug}
        targetSlug={targetSlug}
        schemaCheckId={schemaCheckId}
      />
    );
  },
});

const routeTree = root.addChildren([
  notFoundRoute,
  anonymousRoute.addChildren([
    authRoute.addChildren([
      authIndexRoute,
      authResetPasswordRoute,
      authSignInRoute,
      authSignUpRoute,
      authSSORoute,
      authOIDCRoute,
      authCallbackRoute,
      authVerifyEmailRoute,
    ]),
  ]),
  authenticatedRoute.addChildren([
    indexRoute,
    nativeCompositionDiffRoute,
    devRoute,
    newOrgPage,
    manageRoute,
    logoutRoute,
    organizationRoute.addChildren([
      organizationIndexRoute,
      joinOrganizationRoute,
      transferOrganizationRoute,
      organizationSupportRoute,
      organizationSupportTicketRoute,
      organizationSubscriptionRoute,
      organizationSubscriptionManageRoute,
      organizationSubscriptionManageLegacyRoute,
      organizationMembersRoute,
      organizationPolicyRoute,
      organizationSettingsRoute,
    ]),
    projectRoute.addChildren([
      projectIndexRoute,
      projectSettingsRoute,
      projectPolicyRoute,
      projectAlertsRoute,
    ]),
    targetRoute.addChildren([
      targetIndexRoute,
      targetSettingsRoute,
      targetLaboratoryRoute,
      targetHistoryRoute.addChildren([targetHistoryVersionRoute]),
      targetInsightsRoute,
      targetTraceRoute,
      targetTracesRoute,
      targetInsightsCoordinateRoute,
      targetInsightsClientRoute,
      targetInsightsOperationsRoute,
      targetExplorerRoute,
      targetExplorerDeprecatedRoute,
      targetExplorerUnusedRoute,
      targetExplorerTypeRoute,
      targetChecksRoute.addChildren([targetChecksSingleRoute]),
      targetAppVersionRoute,
      targetAppsRoute,
    ]),
  ]),
]);

export const router = createRouter({
  routeTree,
  parseSearch: parseSearchWith(jsUrlParse),
  stringifySearch: stringifySearchWith(jsUrlStringify),
  // parseSearch: parseSearchWith(value =>
  //   qs.parse(value, {
  //     parseNumbers: true,
  //     parseBooleans: true,
  //     arrayFormat: 'bracket-separator',
  //     arrayFormatSeparator: '|',
  //   }),
  // ),
  // stringifySearch: stringifySearchWith(value =>
  //   qs.stringify(value, {
  //     arrayFormat: 'bracket-separator',
  //     arrayFormatSeparator: '|',
  //   }),
  // ),
});

router.history.subscribe(() => {
  gtag.pageview(router.history.location.href);
});
