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

metadata.openGraph = {
  ...metadata.openGraph,
  // to remove leading slash
  url: '.',
  /**
   * We currently have `metadataBase` which includes `basePath`,
   * so the opengraph-image.png file convention results in a
   * duplicate `basePath` in the OG Image URL.
   *
   * Remove this workaround when we have a fix upstream.
   * Do not extract this workaround to a separate file, as it will stop working.
   */
  images: [
    new URL('./opengraph-image.png', import.meta.url)
      .toString()
      .replace(process.env.NEXT_BASE_PATH || '', ''),
  ],
};

const neueMontreal = localFont({
  src: [
    { path: '../fonts/PPNeueMontreal-Regular.woff2', weight: '400' },
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '500' },
    // Medium is actually 530, so we use it both for 500 and 600
    { path: '../fonts/PPNeueMontreal-Medium.woff2', weight: '600' },
    { path: '../fonts/PPNeueMontreal-SemiBold.woff2', weight: '700' },
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
    '/gateway',
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
