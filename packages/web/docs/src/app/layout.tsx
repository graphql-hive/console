import { ReactNode } from 'react';
import localFont from 'next/font/local';
import {
  AccountBox,
  GitHubIcon,
  GraphQLConfCard,
  HiveFooter,
  HiveNavigation,
  PaperIcon,
  PencilIcon,
  PRODUCTS,
  RightCornerIcon,
  TargetIcon,
} from '@theguild/components';
import { getDefaultMetadata, getPageMap, HiveLayout } from '@theguild/components/server';
import { DynamicMetaTags } from './dynamic-meta-tags';
import graphQLConfLocalImage from '../components/graphql-conf-image.webp';
import '@theguild/components/style.css';
import '../selection-styles.css';
import '../mermaid.css';
import { NarrowPages } from './narrow-pages';

export const metadata = getDefaultMetadata({
  productName: PRODUCTS.HIVE.name,
  websiteName: 'Hive',
  description:
    'Fully Open-source schema registry, analytics and gateway for GraphQL federation and other GraphQL APIs',
});

const neueMontreal = localFont({
  src: [
    { path: '../fonts/PPNeueMontreal-Regular.woff2', weight: '400' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '500' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '600' },
  ],
});

export default async function HiveDocsLayout({ children }: { children: ReactNode }) {
  const pageMap = await getPageMap();

  const lightOnlyPages = [
    '/',
    '/pricing',
    '/federation',
    '/oss-friends',
    '/ecosystem',
    '/partners',
  ];

  return (
    <HiveLayout
      lightOnlyPages={lightOnlyPages}
      head={<DynamicMetaTags pageMap={pageMap} />}
      docsRepositoryBase="https://github.com/graphql-hive/platform/tree/main/packages/web/docs"
      fontFamily={neueMontreal.style.fontFamily}
      navbar={
        <HiveNavigation
          companyMenuChildren={<GraphQLConfCard image={graphQLConfLocalImage} />}
          productName={PRODUCTS.HIVE.name}
          developerMenu={[
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
          ]}
        />
      }
      footer={
        <HiveFooter
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
      }
    >
      {children}
      <NarrowPages pages={lightOnlyPages} />
    </HiveLayout>
  );
}
