'use client';

import { usePathname } from 'next/navigation';
import { cn, HiveFooter } from '@theguild/components';
import { landingPages } from './navigation-menu';

export function Footer() {
  const pathname = usePathname();

  return (
    <HiveFooter
      className={cn(
        landingPages.has(pathname)
          ? 'light'
          : '[&>:first-child]:mx-0 [&>:first-child]:max-w-[90rem]',
        'pt-[72px]',
      )}
      items={{
        resources: [
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
          {
            children: 'Partners',
            href: '/partners',
            title: 'Partners',
          },
        ],
      }}
    />
  );
}
