import { ReactNode } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import { cn, CookiesConsent } from '@theguild/components';

/**
 * Adds styles, cookie consent banner and Radix Tooltip provider.
 */
export function LandingPageContainer(props: { children: ReactNode; className?: string }) {
  return (
    <Tooltip.Provider>
      <div className={cn('flex h-full flex-col', props.className)}>{props.children}</div>
      <CookiesConsent />
    </Tooltip.Provider>
  );
}
