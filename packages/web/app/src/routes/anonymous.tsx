import { z } from 'zod';
import { AuthCard } from '@/components/auth';
import { authenticated } from '@/components/authenticated-container';
import { resolveOidcId } from '@/lib/auth/oidc-lookup';
import { isProviderEnabled } from '@/lib/auth/providers';
import { requireSession } from '@/lib/auth/require-session';
import { doesSessionExist } from '@/lib/auth/session';
import { organizationSlugFromPath, redirectToPathSchema } from '@/lib/route-utils';
import { AuthPage } from '@/pages/auth';
import { AuthCallbackPage } from '@/pages/auth-callback';
import { AuthOIDCPage } from '@/pages/auth-oidc';
import { AuthResetPasswordPage } from '@/pages/auth-reset-password';
import { AuthSignInPage } from '@/pages/auth-sign-in';
import { AuthSignUpPage } from '@/pages/auth-sign-up';
import { AuthSSOPage } from '@/pages/auth-sso';
import { AuthVerifyEmailPage } from '@/pages/auth-verify-email';
import { createRoute, redirect } from '@tanstack/react-router';
import { root } from './root';

export const anonymousRoute = createRoute({
  getParentRoute: () => root,
  id: 'anonymous',
});

export const authRoute = createRoute({
  getParentRoute: () => anonymousRoute,
  path: 'auth',
  component: AuthPage,
});

const AuthSharedSearch = z.object({
  redirectToPath: redirectToPathSchema,
});

export const authIndexRoute = createRoute({
  getParentRoute: () => authRoute,
  path: '/',
  validateSearch(search) {
    return AuthSharedSearch.parse(search);
  },
  beforeLoad: ({ search }) => {
    throw redirect({ to: '/auth/sign-in', search: { redirectToPath: search.redirectToPath } });
  },
});

const AuthResetPasswordRouteSearch = AuthSharedSearch.extend({
  email: z.string().optional(),
  token: z.string().optional(),
});

export const authResetPasswordRoute = createRoute({
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

export const authSignInRoute = createRoute({
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

const slugSearch = z
  .union([z.string(), z.number()])
  .transform(value => String(value).trim().toLowerCase() || undefined)
  .optional()
  .catch(undefined);

const AuthSSORouteSearch = AuthSharedSearch.extend({ slug: slugSearch });
export const authSSORoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'sso',
  validateSearch(search) {
    return AuthSSORouteSearch.parse(search);
  },
  loaderDeps: ({ search }) => search,
  pendingComponent: () => (
    <AuthCard title="Login with SSO" description="Checking your organization's sign-in method" />
  ),
  loader: async ({ deps, preload }) => {
    const slug = deps.slug ?? organizationSlugFromPath(deps.redirectToPath) ?? '';
    if (!slug || preload || !isProviderEnabled('oidc') || (await doesSessionExist())) {
      return { slug };
    }
    const result = await resolveOidcId(slug).catch(() => undefined);
    if (result?.ok) {
      throw redirect({
        to: '/auth/oidc',
        search: { id: result.id, slug, redirectToPath: deps.redirectToPath },
        replace: true,
      });
    }
    return { slug };
  },
  component: () => {
    const { slug } = authSSORoute.useLoaderData();
    const { redirectToPath } = authSSORoute.useSearch();
    return <AuthSSOPage redirectToPath={redirectToPath} initialSlug={slug} />;
  },
});

const AuthOIDCRouteSearch = AuthSharedSearch.extend({
  id: z
    .string({
      error: issue => (issue.input === undefined ? 'OIDC ID is required' : undefined),
    })
    .optional(),
  slug: slugSearch,
});
export const authOIDCRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'oidc',
  validateSearch(search) {
    return AuthOIDCRouteSearch.parse(search);
  },
  component: function AuthOIDCRoute() {
    const { id, slug, redirectToPath } = authOIDCRoute.useSearch();
    return <AuthOIDCPage oidcId={id} slug={slug} redirectToPath={redirectToPath} />;
  },
});

const AuthCallbackRouteParams = z.object({
  provider: z.enum(['oidc', 'okta', 'github', 'google']),
});
export const authCallbackRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'callback/$provider',
  validateSearch(search) {
    return AuthSharedSearch.parse(search);
  },
  component() {
    const params = authCallbackRoute.useParams();
    const { provider } = AuthCallbackRouteParams.parse(params);
    // Where to go next was stashed when the flow started; the search param is only tolerated.
    return AuthCallbackPage({ provider });
  },
});

export const authSignUpRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'sign-up',
  validateSearch(search) {
    return AuthSharedSearch.parse(search);
  },
  component: () => {
    const { redirectToPath } = authSignUpRoute.useSearch();
    return <AuthSignUpPage redirectToPath={redirectToPath} />;
  },
});

const AuthVerifyEmailSearch = z.union([
  z.object({
    userIdentityId: z.string(),
    email: z.string(),
    token: z.string(),
  }),
  z.object({
    userIdentityId: z.undefined().optional(),
    email: z.undefined().optional(),
    token: z.undefined().optional(),
  }),
]);
export const authVerifyEmailRoute = createRoute({
  getParentRoute: () => authRoute,
  path: 'verify-email',
  validateSearch(search) {
    return AuthVerifyEmailSearch.parse(search);
  },
  // Existence only: the page itself works for a session whose email is not verified yet.
  beforeLoad: requireSession,
  component: authenticated(AuthVerifyEmailPage),
});
