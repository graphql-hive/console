// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import { createMemoryHistory, createRouter } from '@tanstack/react-router';

// The tree imports every page; these stand in for what cannot load under jsdom.
vi.mock('@/env/frontend', () => import('@/lib/testing/mocks/env'));
vi.mock('@graphql-hive/laboratory', () => import('@/lib/testing/mocks/laboratory'));
vi.mock(
  '@/lib/laboratory-history-storage',
  () => import('@/lib/testing/mocks/laboratory-history-storage'),
);

const T = '/authenticated/$organizationSlug/$projectSlug/$targetSlug';
const O = '/authenticated/$organizationSlug';

/**
 * One example URL per route, keyed by the route id it must resolve to. Every id in the tree has to
 * appear here (asserted below), so adding a route without an example fails the suite.
 */
const examples: Record<string, string> = {
  '/404': '/404',
  '/logout': '/logout',
  '/join/$inviteCode': '/join/abc',
  '/anonymous/auth/': '/auth',
  '/anonymous/auth/sign-in': '/auth/sign-in',
  '/anonymous/auth/sign-up': '/auth/sign-up',
  '/anonymous/auth/sso': '/auth/sso',
  '/anonymous/auth/oidc': '/auth/oidc',
  '/anonymous/auth/reset-password': '/auth/reset-password',
  '/anonymous/auth/callback/$provider': '/auth/callback/github',
  '/anonymous/auth/verify-email': '/auth/verify-email',
  '/authenticated/': '/',
  '/authenticated/dev': '/dev',
  '/authenticated/manage': '/manage',
  '/authenticated/org/new': '/org/new',
  '/authenticated/native-composition-compatibility-report/$projectId':
    '/native-composition-compatibility-report/p1',
  '/authenticated/action/transfer/$organizationSlug/$code': '/action/transfer/acme/code1',
  [`${O}/`]: '/acme',
  [`${O}/oidc-request`]: '/acme/oidc-request',
  [`${O}/view/support`]: '/acme/view/support',
  [`${O}/view/support/ticket/$ticketId`]: '/acme/view/support/ticket/t1',
  [`${O}/view/subscription`]: '/acme/view/subscription',
  [`${O}/view/subscription/manage`]: '/acme/view/subscription/manage',
  [`${O}/view/manage-subscription`]: '/acme/view/manage-subscription',
  [`${O}/view/members`]: '/acme/view/members',
  [`${O}/view/settings`]: '/acme/view/settings',
  [`${O}/$projectSlug/`]: '/acme/shop',
  [`${O}/$projectSlug/view/settings`]: '/acme/shop/view/settings',
  [`${O}/$projectSlug/view/alerts`]: '/acme/shop/view/alerts',
  [`${T}/`]: '/acme/shop/prod',
  [`${T}/settings`]: '/acme/shop/prod/settings',
  [`${T}/laboratory`]: '/acme/shop/prod/laboratory',
  [`${T}/history`]: '/acme/shop/prod/history',
  [`${T}/history/$versionId`]: '/acme/shop/prod/history/v1',
  [`${T}/insights`]: '/acme/shop/prod/insights',
  [`${T}/insights/manage-filters`]: '/acme/shop/prod/insights/manage-filters',
  [`${T}/insights/schema-coordinate/$coordinate`]:
    '/acme/shop/prod/insights/schema-coordinate/Query.me',
  [`${T}/insights/client/$name`]: '/acme/shop/prod/insights/client/web',
  [`${T}/insights/$operationName/$operationHash`]: '/acme/shop/prod/insights/GetUser/abc123',
  [`${T}/traces`]: '/acme/shop/prod/traces',
  [`${T}/trace/$traceId`]: '/acme/shop/prod/trace/t1',
  [`${T}/traces/$traceId`]: '/acme/shop/prod/traces/t1',
  [`${T}/explorer`]: '/acme/shop/prod/explorer',
  [`${T}/explorer/deprecated`]: '/acme/shop/prod/explorer/deprecated',
  [`${T}/explorer/unused`]: '/acme/shop/prod/explorer/unused',
  [`${T}/explorer/$typename`]: '/acme/shop/prod/explorer/User',
  [`${T}/checks`]: '/acme/shop/prod/checks',
  [`${T}/checks/$schemaCheckId`]: '/acme/shop/prod/checks/c1',
  [`${T}/checks/$schemaCheckId/affected-deployments`]:
    '/acme/shop/prod/checks/c1/affected-deployments',
  [`${T}/apps`]: '/acme/shop/prod/apps',
  [`${T}/apps/$appName/$appVersion`]: '/acme/shop/prod/apps/app/1.0.0',
  [`${T}/proposals`]: '/acme/shop/prod/proposals',
  [`${T}/proposals/new`]: '/acme/shop/prod/proposals/new',
  [`${T}/proposals/$proposalId`]: '/acme/shop/prod/proposals/pr1',
  [`${T}/alerts/`]: '/acme/shop/prod/alerts',
  [`${T}/alerts/rules`]: '/acme/shop/prod/alerts/rules',
  [`${T}/alerts/activity`]: '/acme/shop/prod/alerts/activity',
  [`${T}/alerts/create`]: '/acme/shop/prod/alerts/create',
  [`${T}/alerts/$ruleId`]: '/acme/shop/prod/alerts/rule1',
};

describe('route tree', () => {
  async function build() {
    const { routeTree } = await import('./tree');
    return createRouter({ routeTree, history: createMemoryHistory() });
  }

  it('registers exactly these routes', { timeout: 30_000 }, async () => {
    const router = await build();
    expect(Object.keys(router.routesById).sort()).toMatchInlineSnapshot(`
      [
        /404,
        /anonymous,
        /anonymous/auth,
        /anonymous/auth/,
        /anonymous/auth/callback/$provider,
        /anonymous/auth/oidc,
        /anonymous/auth/reset-password,
        /anonymous/auth/sign-in,
        /anonymous/auth/sign-up,
        /anonymous/auth/sso,
        /anonymous/auth/verify-email,
        /authenticated,
        /authenticated/,
        /authenticated/$organizationSlug,
        /authenticated/$organizationSlug/,
        /authenticated/$organizationSlug/$projectSlug,
        /authenticated/$organizationSlug/$projectSlug/,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts/,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts/$ruleId,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts/activity,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts/create,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/alerts/rules,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/apps,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/apps/$appName/$appVersion,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/checks,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/checks/$schemaCheckId/affected-deployments,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/explorer,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/explorer/$typename,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/explorer/deprecated,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/explorer/unused,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/history,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/history/$versionId,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/insights,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/insights/$operationName/$operationHash,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/insights/client/$name,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/insights/manage-filters,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/insights/schema-coordinate/$coordinate,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/laboratory,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/proposals,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/proposals/$proposalId,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/proposals/new,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/settings,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/trace/$traceId,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/traces,
        /authenticated/$organizationSlug/$projectSlug/$targetSlug/traces/$traceId,
        /authenticated/$organizationSlug/$projectSlug/view/alerts,
        /authenticated/$organizationSlug/$projectSlug/view/settings,
        /authenticated/$organizationSlug/oidc-request,
        /authenticated/$organizationSlug/view/manage-subscription,
        /authenticated/$organizationSlug/view/members,
        /authenticated/$organizationSlug/view/settings,
        /authenticated/$organizationSlug/view/subscription,
        /authenticated/$organizationSlug/view/subscription/manage,
        /authenticated/$organizationSlug/view/support,
        /authenticated/$organizationSlug/view/support/ticket/$ticketId,
        /authenticated/action/transfer/$organizationSlug/$code,
        /authenticated/dev,
        /authenticated/manage,
        /authenticated/native-composition-compatibility-report/$projectId,
        /authenticated/org/new,
        /join/$inviteCode,
        /logout,
        __root__,
      ]
    `);
  });

  it('resolves every route from an example URL', { timeout: 30_000 }, async () => {
    const router = await build();
    const covered = new Set<string>();

    for (const [routeId, url] of Object.entries(examples)) {
      const matched = router.matchRoutes(url, {}).map(m => m.routeId);
      expect({ url, leaf: matched.at(-1) }).toEqual({ url, leaf: routeId });
      for (const id of matched) {
        covered.add(id);
      }
    }

    const uncovered = Object.keys(router.routesById).filter(id => !covered.has(id));
    expect(uncovered).toEqual([]);
  });

  // Slug params absorb any three leading segments, so an unknown deeper path stops at the target
  // route and its `notFoundComponent` renders the 404, rather than a page route matching by accident.
  it('stops unknown paths under a target at the target route', { timeout: 30_000 }, async () => {
    const router = await build();
    const matched = router.matchRoutes('/nope/x/y/z/404', {}).map(m => m.routeId);
    expect(matched.at(-1)).toBe(T);
  });
});
