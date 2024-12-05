'use client';

import { usePathname } from 'next/navigation';
import { cn, HiveFooter } from '@theguild/components';
import { isLandingPage } from './navigation-menu';

export function Footer() {
  const route = usePathname();

  return (
    <HiveFooter
      className={cn(
        isLandingPage(route || '/')
          ? 'light'
          : '[&>:first-child]:mx-0 [&>:first-child]:max-w-[90rem]',
        'pt-[72px]',
      )}
      resources={[
        {
          children: 'Privacy Policy',
          href: 'https://the-guild.dev/graphql/hive/privacy-policy.pdf',
          title: 'Privacy Policy',
        },
        {
          children: 'Terms of Use',
          href: 'https://the-guild.dev/graphql/hive/terms-of-use.pdf',
          title: 'Terms of Use',
        },
      ]}
    />
  );
}