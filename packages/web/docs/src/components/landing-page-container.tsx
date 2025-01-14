import { ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn, CookiesConsent } from '@theguild/components';
import { AddLightClassToBody } from '../lib';

/**
 * Adds styles, cookie consent banner and Radix Tooltip provider.
 */
export function LandingPageContainer(props: { children: ReactNode; className?: string }) {
  return (
    <Tooltip.Provider>
      <AddLightClassToBody />
      <style>
        {
          /* css */ `
          html {
            scroll-behavior: smooth;
            background: #fff;
            color-scheme: light !important;
          }

          .nextra-search-results mark {
            background: oklch(0.611752 0.07807 214.47 / 0.8);
          }

          .nextra-sidebar-footer {
            display: none;
          }
          #crisp-chatbox { z-index: 40 !important; }
        `
        }
      </style>
      <div className={cn('flex h-full flex-col', props.className)}>{props.children}</div>
      <CookiesConsent />
    </Tooltip.Provider>
  );
}
