import { ReactElement, useEffect } from 'react';
import { AppProps } from 'next/app';
import Router from 'next/router';
import Script from 'next/script';
import { ToastContainer } from 'react-toastify';
import SuperTokens, { SuperTokensWrapper } from 'supertokens-auth-react';
import Session from 'supertokens-auth-react/recipe/session';
import { Provider as UrqlProvider } from 'urql';
import { LoadingAPIIndicator } from '@/components/common/LoadingAPI';
import { frontendConfig } from '@/config/supertokens/frontend';
import { env } from '@/env/frontend';
import * as gtag from '@/lib/gtag';
import { urqlClient } from '@/lib/urql';
import { configureScope, init } from '@sentry/nextjs';
import '../public/styles.css';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster } from '@/components/ui/toaster';

function identifyOnSentry(userId: string, email: string): void {
  configureScope(scope => {
    scope.setUser({ id: userId, email });
  });
}

export default function App({ Component, pageProps }: AppProps): ReactElement {
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      gtag.pageview(url);
    };

    Router.events.on('routeChangeComplete', handleRouteChange);
    Router.events.on('hashChangeComplete', handleRouteChange);
    return () => {
      Router.events.off('routeChangeComplete', handleRouteChange);
      Router.events.off('hashChangeComplete', handleRouteChange);
    };
  }, []);

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
    <>
      {env.analytics.googleAnalyticsTrackingId && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${env.analytics.googleAnalyticsTrackingId}`}
          />
          <Script
            id="gtag-init"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${env.analytics.googleAnalyticsTrackingId}', {
                  page_path: window.location.pathname,
                });`,
            }}
          />
        </>
      )}

      <SuperTokensWrapper>
        <UrqlProvider value={urqlClient}>
          <LoadingAPIIndicator />
          <Component {...pageProps} />
        </UrqlProvider>
      </SuperTokensWrapper>
      <Toaster />
      <ToastContainer hideProgressBar />
    </>
  );
}
if (globalThis.window) {
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
}
