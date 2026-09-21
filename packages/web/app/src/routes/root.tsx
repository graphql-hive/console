import { lazy, useEffect } from 'react';
import { HelmetProvider } from 'react-helmet-async';
import { SuperTokensWrapper } from 'supertokens-auth-react';
import Session from 'supertokens-auth-react/recipe/session';
import { Provider as UrqlProvider } from 'urql';
import { TooltipProvider } from '@/components/base/floating/tooltip/tooltip';
import { NotFound } from '@/components/base/not-found/not-found';
import { ToastProvider } from '@/components/base/toast/toast';
import { LoadingAPIIndicator } from '@/components/common/LoadingAPI';
import { ThemeProvider } from '@/components/theme/theme-provider';
import { urqlClient } from '@/lib/urql';
import { LogoutPage } from '@/pages/logout';
import { JoinOrganizationPage } from '@/pages/organization-join';
import { captureMessage, getCurrentScope } from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createRootRoute, createRoute, Outlet, useRouter } from '@tanstack/react-router';

const queryClient = new QueryClient();

const LazyTanStackRouterDevtools = lazy(() =>
  import('@tanstack/react-router-devtools').then(({ TanStackRouterDevtools }) => ({
    default: TanStackRouterDevtools,
  })),
);

function identifyOnSentry(userId: string, email: string): void {
  getCurrentScope().setUser({ id: userId, email });
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
    <ThemeProvider>
      <TooltipProvider>
        <ToastProvider>
          <HelmetProvider>
            <SuperTokensWrapper>
              <QueryClientProvider client={queryClient}>
                <UrqlProvider value={urqlClient}>
                  <LoadingAPIIndicator />
                  <Outlet />
                </UrqlProvider>
              </QueryClientProvider>
            </SuperTokensWrapper>
            {/* eslint-disable-next-line no-process-env */}
            {process.env.NODE_ENV === 'development' && <LazyTanStackRouterDevtools />}
          </HelmetProvider>
        </ToastProvider>
      </TooltipProvider>
    </ThemeProvider>
  );
}

export function RouteNotFound() {
  const router = useRouter();

  captureMessage('404 Not Found', {
    level: 'warning',
    extra: {
      href1: router.history.location.href,
      href2: window.location.href,
      href3: router.latestLocation.href,
    },
  });

  return <NotFound bigHeading="404" title="Page Not Found" variants={{ fullScreen: true }} />;
}

export const root = createRootRoute({
  component: RootComponent,
});

// Routes that sit outside both the anonymous and the authenticated gates.

export const notFoundRoute = createRoute({
  getParentRoute: () => root,
  path: '404',
  component: RouteNotFound,
});

export const logoutRoute = createRoute({
  getParentRoute: () => root,
  path: 'logout',
  component: LogoutPage,
});

export const joinOrganizationRoute = createRoute({
  getParentRoute: () => root,
  path: 'join/$inviteCode',
  component: function JoinOrganizationRoute() {
    const { inviteCode } = joinOrganizationRoute.useParams();
    return <JoinOrganizationPage inviteCode={inviteCode} />;
  },
});
