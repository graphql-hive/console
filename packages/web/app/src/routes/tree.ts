import {
  anonymousRoute,
  authCallbackRoute,
  authIndexRoute,
  authOIDCRoute,
  authResetPasswordRoute,
  authRoute,
  authSignInRoute,
  authSignUpRoute,
  authSSORoute,
  authVerifyEmailRoute,
} from './anonymous';
import {
  authenticatedRoute,
  devRoute,
  indexRoute,
  manageRoute,
  nativeCompositionDiffRoute,
  newOrgPage,
  organizationOIDCRequestRoute,
  transferOrganizationRoute,
} from './authenticated';
import {
  organizationIndexRoute,
  organizationMembersRoute,
  organizationRoute,
  organizationSettingsRoute,
  organizationSubscriptionManageLegacyRoute,
  organizationSubscriptionManageRoute,
  organizationSubscriptionRoute,
  organizationSupportRoute,
  organizationSupportTicketRoute,
} from './organization';
import {
  projectAlertsRoute,
  projectIndexRoute,
  projectRoute,
  projectSettingsRoute,
} from './project';
import { joinOrganizationRoute, logoutRoute, notFoundRoute, root } from './root';
import {
  targetAlertsActivityRoute,
  targetAlertsCreateRoute,
  targetAlertsDetailRoute,
  targetAlertsIndexRoute,
  targetAlertsRoute,
  targetAlertsRulesRoute,
} from './target/alerts';
import { targetAppsRoute, targetAppVersionRoute } from './target/apps';
import {
  targetChecksAffectedDeploymentsRoute,
  targetChecksRoute,
  targetChecksSingleRoute,
} from './target/checks';
import {
  targetExplorerDeprecatedRoute,
  targetExplorerRoute,
  targetExplorerTypeRoute,
  targetExplorerUnusedRoute,
} from './target/explorer';
import { targetHistoryRoute, targetHistoryVersionRoute } from './target/history';
import {
  targetInsightsClientRoute,
  targetInsightsCoordinateRoute,
  targetInsightsManageFiltersRoute,
  targetInsightsOperationsRoute,
  targetInsightsRoute,
} from './target/insights';
import { targetLaboratoryRoute } from './target/laboratory';
import {
  targetProposalsNewRoute,
  targetProposalsRoute,
  targetProposalsSingleRoute,
} from './target/proposals';
import { targetIndexRoute, targetRoute } from './target/route';
import { targetSettingsRoute } from './target/settings';
import { targetTraceRoute, targetTracesRoute } from './target/traces';

// Every route sits under the parent its `getParentRoute` names. The router derives paths and
// matches from `getParentRoute`, so this tree must agree with it or the two disagree silently.
export const routeTree = root.addChildren([
  notFoundRoute,
  logoutRoute,
  joinOrganizationRoute,
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
    transferOrganizationRoute,
    organizationOIDCRequestRoute,
    organizationRoute.addChildren([
      organizationIndexRoute,
      organizationSupportRoute,
      organizationSupportTicketRoute,
      organizationSubscriptionRoute,
      organizationSubscriptionManageRoute,
      organizationSubscriptionManageLegacyRoute,
      organizationMembersRoute,
      organizationSettingsRoute,
    ]),
    projectRoute.addChildren([projectIndexRoute, projectSettingsRoute, projectAlertsRoute]),
    targetRoute.addChildren([
      targetIndexRoute,
      targetSettingsRoute,
      targetLaboratoryRoute,
      targetHistoryRoute.addChildren([targetHistoryVersionRoute]),
      targetInsightsRoute,
      targetInsightsManageFiltersRoute,
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
      targetChecksAffectedDeploymentsRoute,
      targetAppVersionRoute,
      targetAppsRoute,
      targetProposalsRoute,
      targetProposalsNewRoute,
      targetProposalsSingleRoute,
      targetAlertsRoute.addChildren([
        targetAlertsIndexRoute,
        targetAlertsRulesRoute,
        targetAlertsActivityRoute,
        targetAlertsCreateRoute,
        targetAlertsDetailRoute,
      ]),
    ]),
  ]),
]);
