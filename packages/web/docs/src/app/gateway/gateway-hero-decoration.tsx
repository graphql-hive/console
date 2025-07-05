import { ReactNode } from 'react';
import { DecorationIsolation, HiveGatewayIcon } from '@theguild/components';

export function GatewayHeroDecoration({ children }: { children: ReactNode }) {
  return (
    <DecorationIsolation className="-z-10">
      <HiveGatewayIcon className="absolute left-[-268px] top-[-8px] size-[520px] fill-[url(#gateway-hero-gradient)] max-lg:hidden" />
      <HiveGatewayIcon className="absolute right-[-144px] top-[-64px] size-[320px] fill-[url(#gateway-hero-gradient-mobile)] md:bottom-[-64px] md:right-[-268px] md:top-auto md:size-[520px] md:fill-[url(#gateway-hero-gradient)] lg:bottom-[-8px]" />
      <svg
        className="pointer-events-none -z-50 size-0"
        width="192"
        height="296"
        viewBox="0 0 192 296"
      >
        {children}
      </svg>
    </DecorationIsolation>
  );
}
