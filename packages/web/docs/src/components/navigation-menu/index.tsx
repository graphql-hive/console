'use client';

import { usePathname } from 'next/navigation';
import {
  AccountBox,
  GitHubIcon,
  GraphQLConfCard,
  HiveNavigation,
  HiveNavigationProps,
  PaperIcon,
  PencilIcon,
  PRODUCTS,
  RightCornerIcon,
  TargetIcon,
} from '@theguild/components';
import graphQLConfLocalImage from './graphql-conf-image.webp';

const developerMenu: HiveNavigationProps['developerMenu'] = [
  {
    href: '/docs',
    icon: <PaperIcon />,
    children: 'Documentation',
  },
  { href: 'https://status.graphql-hive.com/', icon: <TargetIcon />, children: 'Status' },
  {
    href: '/product-updates',
    icon: <RightCornerIcon />,
    children: 'Product Updates',
  },
  {
    href: '/case-studies',
    icon: <AccountBox />,
    children: 'Case Studies',
  },
  { href: 'https://the-guild.dev/blog', icon: <PencilIcon />, children: 'Blog' },
  {
    href: 'https://github.com/graphql-hive/console',
    icon: <GitHubIcon />,
    children: 'GitHub',
  },
];

export function NavigationMenu() {
  const pathname = usePathname();

  return (
    <HiveNavigation
      className={landingPages.has(pathname) ? 'light max-w-[1392px]' : 'max-w-[90rem]'}
      companyMenuChildren={<GraphQLConfCard image={graphQLConfLocalImage} />}
      productName={PRODUCTS.HIVE.name}
      developerMenu={developerMenu}
    />
  );
}

export const landingPages = new Set([
  '/',
  '/pricing',
  '/federation',
  '/oss-friends',
  '/ecosystem',
  '/partners',
]);
