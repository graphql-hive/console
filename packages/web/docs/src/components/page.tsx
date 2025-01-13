import { ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { CookiesConsent, useMounted } from '@theguild/components';
import { cn, useTheme } from '../lib';

export function Page(props: { children: ReactNode; className?: string }) {
  const mounted = useMounted();
  useTheme();

  return (
    <Tooltip.Provider>
      <style global jsx>
        {`
          html {
            scroll-behavior: smooth;
            color-scheme: light !important;
          }
          body {
            background: #fff;
            --nextra-primary-hue: 191deg;
            --nextra-primary-saturation: 40%;
            --nextra-bg: 255, 255, 255;
          }
          .nextra-sidebar-footer {
            display: none;
          }
        `}
      </style>
      <div className={cn('flex h-full flex-col', props.className)}>{props.children}</div>
      {mounted && <CookiesConsent />}
      {/* position Crisp button below the cookies banner */}
      <style jsx global>
        {' #crisp-chatbox { z-index: 40 !important; '}
      </style>
    </Tooltip.Provider>
  );
}
