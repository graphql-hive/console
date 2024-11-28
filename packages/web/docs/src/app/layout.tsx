/* eslint-disable import/no-extraneous-dependencies */
import { ReactNode } from 'react';
import localFont from 'next/font/local';
import { Layout } from 'nextra-theme-docs';
import { Head } from 'nextra/components';
import { getPageMap } from 'nextra/page-map';
import '@theguild/components/style.css';
import '../components/navigation-menu/navbar-global-styles.css';
import '../selection-styles.css';
import { PRODUCTS } from '@theguild/components';
import { getDefaultMetadata } from '@theguild/components/server';
import { Footer } from '../components/footer';
import { NavigationMenu } from '../components/navigation-menu';

export default function RootLayout({ children }: { children: ReactNode }) {
  return <HiveLayout>{children}</HiveLayout>;
}

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

const siteOrigin = 'https://the-guild.dev';

const companyItem = {
  type: 'menu',
  title: 'Company',
  items: {
    about: { title: 'About', href: `${siteOrigin}/about-us` },
    blog: { title: 'Blog', href: `${siteOrigin}/blog` },
    contact: { title: 'Contact', href: `${siteOrigin}/#get-in-touch` },
  },
};

const productsItems = {
  type: 'menu',
  title: 'Products',
  items: Object.fromEntries(
    Object.values(PRODUCTS).map(product => [
      product.name,
      {
        title: (
          <span className="inline-flex items-center gap-2" title={product.title}>
            <product.logo className="size-7 shrink-0" />
            {product.name}
          </span>
        ),
        href: product.href,
      },
    ]),
  ),
};

/**
 * Alternative to `GuildLayout` for Hive and Hive Gateway websites.
 */
const HiveLayout = async ({ children }: { children: ReactNode }) => {
  const [meta, ...pageMap] = await getPageMap();

  console.log('pageMap', pageMap);

  const pageMapWithCompanyMenu = [
    {
      data: {
        company: companyItem,
        products: productsItems,
        // @ts-expect-error -- fixme (copied from Dima's v8 PR (sorry))
        ...meta.data,
      },
    },
    // Add for every website except The Guild Blog
    { name: 'company', route: '#', ...companyItem },
    { name: 'products', route: '#', ...productsItems },
    ...pageMap,
  ];

  return (
    <html
      lang="en"
      // Required to be set for `nextra-theme-docs` styles
      dir="ltr"
      // Suggested by `next-themes` package https://github.com/pacocoursey/next-themes#with-app
      suppressHydrationWarning
    >
      <Head>
        <style>{
          /* css */ `
          :root {
            --font-sans: ${neueMontreal.style.fontFamily};
          }
          ._tracking-tight,
          .nextra-steps :is(h2, h3, h4) {
            letter-spacing: normal;
          }
        `
        }</style>
      </Head>
      <body>
        <Layout
          editLink="Edit this page on GitHub"
          docsRepositoryBase="https://github.com/graphql-hive/platform/tree/main/packages/web/docs"
          pageMap={pageMapWithCompanyMenu}
          feedback={{
            labels: 'kind/docs',
          }}
          navbar={<NavigationMenu />}
          sidebar={{
            defaultMenuCollapseLevel: 1,
          }}
          footer={<Footer />}
        >
          {children}
        </Layout>
      </body>
    </html>
  );
};
